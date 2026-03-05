import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Copy, ExternalLink, Film, Library, Plus, Save, Share2, Sparkles, UploadCloud } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { PageHeader } from "../../components/PageHeader";
import { useNotification } from "../../contexts/NotificationContext";
import { useCreateAssetMutation } from "../../hooks/api/useAssets";
import {
  useLiveReplaysQuery,
  useLiveSessionsQuery,
  usePublishReplayMutation,
  useReplayQuery,
  useUpdateReplayMutation
} from "../../hooks/api/useLiveRuntime";
import type { LiveReplayClipRecord, LiveReplayRecord, UpdateLiveReplayInput } from "../../api/types";
import { formatCurrency, formatDateTime } from "../../utils/runtimeData";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

type PublishFilter = "all" | "published" | "draft";

type ExportTargets = {
  campaigns: boolean;
  social: boolean;
  assetLibrary: boolean;
};

function parseReplayId(search: string): string | undefined {
  const value = new URLSearchParams(search).get("replayId") || undefined;
  return value?.trim() || undefined;
}

function statusLabel(replay: LiveReplayRecord | undefined): string {
  if (!replay) return "Draft";
  return replay.published ? "Published" : "Draft";
}

function statusTone(replay: LiveReplayRecord | undefined): string {
  if (!replay) return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  return replay.published
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
    : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300";
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function secondsToLabel(value: number | undefined): string {
  const total = Math.max(0, Number(value || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function numberValue(record: LiveReplayRecord | undefined, key: string): number {
  const raw = record && typeof record === "object" ? (record as Record<string, unknown>)[key] : 0;
  return Number(raw || 0);
}

function buildSuggestions(replay: LiveReplayRecord | undefined): Array<{ id: string; title: string; startSec: number; endSec: number; reason: string }> {
  const notes = Array.isArray(replay?.notes) ? replay.notes : [];
  const clips = Array.isArray(replay?.clips) ? replay.clips : [];
  const suggestions = clips.map((clip) => ({
    id: `existing_${clip.id}`,
    title: clip.title,
    startSec: Number(clip.startSec || 0),
    endSec: Number(clip.endSec || 30),
    reason: `Saved ${clip.status || "clip"}`
  }));

  if (suggestions.length >= 3) return suggestions.slice(0, 3);

  const extra = notes.slice(0, 3 - suggestions.length).map((note, index) => ({
    id: `note_${index}`,
    title: note,
    startSec: index * 30,
    endSec: index * 30 + 30,
    reason: replay?.hook || "Suggested from replay notes"
  }));

  return [...suggestions, ...extra];
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

function MetricTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ReplayShareDrawer({ replay, onClose }: { replay: LiveReplayRecord; onClose: () => void }) {
  const shareUrl = replay.replayUrl || `https://mylivedealz.com/replay/${replay.sessionId}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 md:items-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Share replay</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use the backend replay URL for distribution and link-tool handoff.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-200"
          >
            Close
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center gap-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5">
          <QRCodeCanvas value={shareUrl} size={160} includeMargin />
          <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-600 dark:text-slate-300 break-all">
            {shareUrl}
          </div>
          <div className="flex w-full flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copyText(shareUrl)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white"
            >
              <Copy className="h-4 w-4" />
              Copy replay link
            </button>
            <button
              type="button"
              onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              <ExternalLink className="h-4 w-4" />
              Open replay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReplayListItem({
  replay,
  active,
  onSelect,
  onShare
}: {
  replay: LiveReplayRecord;
  active: boolean;
  onSelect: () => void;
  onShare: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        "w-full rounded-3xl border p-4 text-left transition-colors",
        active
          ? "border-[#f77f00] bg-orange-50/70 dark:border-[#f77f00] dark:bg-orange-950/10"
          : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cx("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", statusTone(replay))}>{statusLabel(replay)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(replay.date)}</span>
          </div>
          <div className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{replay.title}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{replay.hook || "No replay hook yet"}</div>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onShare();
          }}
          className="rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200"
        >
          Share
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{numberValue(replay, "views").toLocaleString()}</div>
          <div>Views</div>
        </div>
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{numberValue(replay, "sales").toLocaleString()}</div>
          <div>Sales</div>
        </div>
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{secondsToLabel(numberValue(replay, "durationSec"))}</div>
          <div>Duration</div>
        </div>
      </div>
    </button>
  );
}

function ClipRow({
  clip,
  onChange,
  onRemove
}: {
  clip: LiveReplayClipRecord;
  onChange: (patch: Partial<LiveReplayClipRecord>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_90px_90px_90px_auto]">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Title
          <input
            value={clip.title}
            onChange={(event) => onChange({ title: event.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Start
          <input
            type="number"
            min={0}
            value={clip.startSec}
            onChange={(event) => onChange({ startSec: Number(event.target.value || 0) })}
            className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          End
          <input
            type="number"
            min={0}
            value={clip.endSec}
            onChange={(event) => onChange({ endSec: Number(event.target.value || 0) })}
            className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Format
          <select
            value={clip.format}
            onChange={(event) => onChange({ format: event.target.value })}
            className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
          </select>
        </label>
        <div className="flex items-end justify-end">
          <button
            type="button"
            onClick={onRemove}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-[#f77f00]" : "bg-slate-300 dark:bg-slate-700"
      )}
    >
      <span className={cx("inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}

function LiveReplaysClipsPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useNotification();
  const seededReplayId = useMemo(() => parseReplayId(location.search), [location.search]);

  const [publishFilter, setPublishFilter] = useState<PublishFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedReplayId, setSelectedReplayId] = useState<string | undefined>(seededReplayId);
  const [shareReplay, setShareReplay] = useState<LiveReplayRecord | null>(null);
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [retention, setRetention] = useState("");
  const [notesText, setNotesText] = useState("");
  const [replayUrl, setReplayUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [showProductStrip, setShowProductStrip] = useState(true);
  const [scheduledPublishAt, setScheduledPublishAt] = useState("");
  const [clips, setClips] = useState<LiveReplayClipRecord[]>([]);
  const [draftClipTitle, setDraftClipTitle] = useState("Highlight clip");
  const [draftClipStart, setDraftClipStart] = useState(0);
  const [draftClipEnd, setDraftClipEnd] = useState(30);
  const [draftClipFormat, setDraftClipFormat] = useState("9:16");
  const [exportTargets, setExportTargets] = useState<ExportTargets>({ campaigns: true, social: true, assetLibrary: true });

  const replaysQuery = useLiveReplaysQuery({
    q: search || undefined,
    published: publishFilter === "all" ? undefined : String(publishFilter === "published")
  });
  const sessionsQuery = useLiveSessionsQuery({}, { staleTime: 15_000 });
  const replayQuery = useReplayQuery(selectedReplayId, { enabled: Boolean(selectedReplayId) });
  const updateReplayMutation = useUpdateReplayMutation();
  const publishReplayMutation = usePublishReplayMutation();
  const createAssetMutation = useCreateAssetMutation();

  const replayItems = replaysQuery.data?.items ?? [];
  const selectedReplay = replayQuery.data ?? replayItems.find((item) => item.id === selectedReplayId) ?? null;
  const selectedSession = sessionsQuery.data?.items.find((item) => item.id === selectedReplay?.sessionId);

  useEffect(() => {
    if (selectedReplayId) return;
    if (seededReplayId) {
      setSelectedReplayId(seededReplayId);
      return;
    }
    if (replayItems.length) {
      setSelectedReplayId(replayItems[0].id);
    }
  }, [replayItems, seededReplayId, selectedReplayId]);

  useEffect(() => {
    if (!selectedReplay) return;
    setTitle(selectedReplay.title || "Untitled replay");
    setHook(selectedReplay.hook || "");
    setRetention(selectedReplay.retention || "");
    setNotesText(Array.isArray(selectedReplay.notes) ? selectedReplay.notes.join("\n") : "");
    setReplayUrl(selectedReplay.replayUrl || "");
    setCoverUrl(selectedReplay.coverUrl || "");
    setAllowComments(Boolean(selectedReplay.allowComments ?? true));
    setShowProductStrip(Boolean(selectedReplay.showProductStrip ?? true));
    setScheduledPublishAt(toDateInput(selectedReplay.scheduledPublishAt));
    setClips(Array.isArray(selectedReplay.clips) ? selectedReplay.clips : []);
    setDraftClipTitle(`${selectedReplay.title || "Replay"} clip`);
  }, [selectedReplay]);

  const notes = useMemo(
    () => notesText.split(/\n|,/).map((entry) => entry.trim()).filter(Boolean),
    [notesText]
  );

  const summary = useMemo(() => {
    return replayItems.reduce(
      (accumulator, replay) => {
        accumulator.views += numberValue(replay, "views");
        accumulator.sales += numberValue(replay, "sales");
        accumulator.replays += 1;
        accumulator.published += replay.published ? 1 : 0;
        return accumulator;
      },
      { views: 0, sales: 0, replays: 0, published: 0 }
    );
  }, [replayItems]);

  const suggestions = useMemo(() => buildSuggestions(selectedReplay || undefined), [selectedReplay]);

  const persistReplay = async (publish: boolean) => {
    if (!selectedReplay) return null;
    const payload: UpdateLiveReplayInput = {
      title: title.trim() || "Untitled replay",
      hook: hook.trim(),
      retention: retention.trim(),
      notes,
      replayUrl: replayUrl.trim(),
      coverUrl: coverUrl.trim(),
      allowComments,
      showProductStrip,
      clips,
      scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
      ...(publish ? { published: true } : {})
    };

    if (publish) {
      return publishReplayMutation.mutateAsync({ replayId: selectedReplay.id, payload });
    }
    return updateReplayMutation.mutateAsync({ replayId: selectedReplay.id, payload });
  };

  const handleSave = async () => {
    try {
      await persistReplay(false);
      showSuccess("Replay draft saved to the backend.");
    } catch {
      showError("Replay draft could not be saved.");
    }
  };

  const handlePublish = async () => {
    try {
      await persistReplay(true);
      showSuccess("Replay published from backend state.");
    } catch {
      showError("Replay could not be published.");
    }
  };

  const handleAddClip = () => {
    if (draftClipEnd <= draftClipStart) {
      showError("Clip end time must be after the start time.");
      return;
    }
    setClips((current) => [
      ...current,
      {
        id: `clip_${Date.now()}`,
        title: draftClipTitle.trim() || `Clip ${current.length + 1}`,
        startSec: draftClipStart,
        endSec: draftClipEnd,
        format: draftClipFormat,
        status: "Draft"
      }
    ]);
    showSuccess("Clip added to the replay draft.");
  };

  const handleExportClip = async () => {
    if (!selectedReplay) return;
    const newClip: LiveReplayClipRecord = {
      id: `clip_${Date.now()}`,
      title: draftClipTitle.trim() || `${selectedReplay.title} clip`,
      startSec: draftClipStart,
      endSec: draftClipEnd,
      format: draftClipFormat,
      status: exportTargets.social ? "Ready for distribution" : "Draft"
    };
    const nextClips = [...clips, newClip];
    setClips(nextClips);

    try {
      await updateReplayMutation.mutateAsync({
        replayId: selectedReplay.id,
        payload: {
          title: title.trim() || selectedReplay.title,
          hook: hook.trim(),
          retention: retention.trim(),
          notes,
          replayUrl: replayUrl.trim(),
          coverUrl: coverUrl.trim(),
          allowComments,
          showProductStrip,
          clips: nextClips,
          scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null
        }
      });

      if (exportTargets.assetLibrary) {
        await createAssetMutation.mutateAsync({
          title: newClip.title,
          mediaType: "video",
          campaignId: selectedSession?.campaignId || null,
          brand: selectedSession?.seller || "Live replay",
          source: "live_history",
          status: "approved",
          previewUrl: replayUrl.trim() || selectedReplay.replayUrl || "",
          thumbnailUrl: coverUrl.trim() || selectedReplay.coverUrl || "",
          previewKind: "video",
          usageNotes: `Derived from replay ${selectedReplay.title}`,
          tags: ["replay", "clip", exportTargets.social ? "social" : "draft"]
        });
      }

      const exportSummary = [
        `Replay: ${selectedReplay.title}`,
        `Clip: ${newClip.title}`,
        `Window: ${secondsToLabel(newClip.startSec)} - ${secondsToLabel(newClip.endSec)}`,
        `Targets: ${Object.entries(exportTargets).filter(([, enabled]) => enabled).map(([key]) => key).join(", ") || "none"}`
      ].join("\n");
      const blob = new Blob([exportSummary], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${selectedReplay.id}_${newClip.id}.txt`;
      anchor.click();
      URL.revokeObjectURL(url);

      showSuccess("Clip metadata saved to the backend and exported.");
    } catch {
      showError("Clip export could not be completed.");
    }
  };

  if (replaysQuery.isLoading && replayItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
        <PageHeader pageTitle="Live Replays & Clips" />
        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <SectionCard title="Loading replay library" subtitle="Pulling the published and draft replay payloads from the backend." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50 transition-colors">
      <PageHeader
        pageTitle="Live Replays & Clips"
        badge={<span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-xs font-semibold">Backend-driven replay library</span>}
        rightContent={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedReplay || updateReplayMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Save draft
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!selectedReplay || publishReplayMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              <UploadCloud className="h-4 w-4" />
              Publish replay
            </button>
          </div>
        }
      />

      <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-4">
          <MetricTile label="Replay library" value={summary.replays.toString()} hint={`${summary.published} already published`} />
          <MetricTile label="Replay views" value={summary.views.toLocaleString()} hint="Live history totals" />
          <MetricTile label="Sales driven" value={summary.sales.toLocaleString()} hint="Attached replay performance" />
          <MetricTile label="Selected replay" value={selectedReplay ? statusLabel(selectedReplay) : "-"} hint={selectedSession?.title || "Choose a replay"} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <SectionCard title="Replay list" subtitle="These rows are coming from /api/live/replays.">
              <div className="mb-4 flex flex-col gap-3">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search replay title, hook, or notes"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  {(["all", "published", "draft"] as PublishFilter[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPublishFilter(option)}
                      className={cx(
                        "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                        publishFilter === option
                          ? "bg-[#f77f00] text-white"
                          : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {replayItems.map((replay) => (
                  <ReplayListItem
                    key={replay.id}
                    replay={replay}
                    active={replay.id === selectedReplayId}
                    onSelect={() => setSelectedReplayId(replay.id)}
                    onShare={() => setShareReplay(replay)}
                  />
                ))}
                {!replayItems.length ? <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-sm text-slate-500 dark:text-slate-400">No replay records matched this filter.</div> : null}
              </div>
            </SectionCard>

            <SectionCard title="AI clip suggestions" subtitle="Suggestions are generated from persisted clips and replay notes.">
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => {
                      setDraftClipTitle(suggestion.title);
                      setDraftClipStart(suggestion.startSec);
                      setDraftClipEnd(suggestion.endSec);
                    }}
                    className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-left"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      <Sparkles className="h-4 w-4 text-[#f77f00]" />
                      {suggestion.title}
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{secondsToLabel(suggestion.startSec)} - {secondsToLabel(suggestion.endSec)} · {suggestion.reason}</div>
                  </button>
                ))}
                {!suggestions.length ? <div className="text-sm text-slate-500 dark:text-slate-400">No suggestions yet for this replay.</div> : null}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Replay detail" subtitle="Edit the persisted replay payload and save it back to the backend.">
              {selectedReplay ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Replay title
                      <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Hook
                      <input value={hook} onChange={(event) => setHook(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                    </label>
                  </div>

                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Retention notes
                    <input value={retention} onChange={(event) => setRetention(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Replay notes
                    <textarea value={notesText} onChange={(event) => setNotesText(event.target.value)} rows={4} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Replay URL
                      <input value={replayUrl} onChange={(event) => setReplayUrl(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Cover URL
                      <input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Scheduled publish
                      <input type="datetime-local" value={scheduledPublishAt} onChange={(event) => setScheduledPublishAt(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                    </label>
                    <div className="flex items-center justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Allow comments</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Stored in replay payload</div>
                      </div>
                      <Toggle checked={allowComments} onChange={setAllowComments} />
                    </div>
                    <div className="flex items-center justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Show product strip</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Replay commerce overlay</div>
                      </div>
                      <Toggle checked={showProductStrip} onChange={setShowProductStrip} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setShareReplay(selectedReplay)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <Share2 className="h-4 w-4" />
                      Share replay
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/post-live?sessionId=${encodeURIComponent(selectedReplay.sessionId)}`)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <Film className="h-4 w-4" />
                      Open post-live flow
                    </button>
                    {selectedReplay.replayUrl ? (
                      <button
                        type="button"
                        onClick={() => window.open(selectedReplay.replayUrl, "_blank", "noopener,noreferrer")}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open replay URL
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">Choose a replay from the list to edit it.</div>
              )}
            </SectionCard>

            <SectionCard title="Clips" subtitle="Clip windows are saved back into the replay record and can also be pushed into the asset library.">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_100px_100px_110px_auto]">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  New clip title
                  <input value={draftClipTitle} onChange={(event) => setDraftClipTitle(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Start sec
                  <input type="number" min={0} value={draftClipStart} onChange={(event) => setDraftClipStart(Number(event.target.value || 0))} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  End sec
                  <input type="number" min={0} value={draftClipEnd} onChange={(event) => setDraftClipEnd(Number(event.target.value || 0))} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Format
                  <select value={draftClipFormat} onChange={(event) => setDraftClipFormat(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                    <option value="9:16">9:16</option>
                    <option value="1:1">1:1</option>
                    <option value="16:9">16:9</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <button type="button" onClick={handleAddClip} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white">
                    <Plus className="h-4 w-4" />
                    Add clip
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {clips.map((clip) => (
                  <ClipRow
                    key={clip.id}
                    clip={clip}
                    onChange={(patch) => setClips((current) => current.map((entry) => (entry.id === clip.id ? { ...entry, ...patch } : entry)))}
                    onRemove={() => setClips((current) => current.filter((entry) => entry.id !== clip.id))}
                  />
                ))}
                {!clips.length ? <div className="text-sm text-slate-500 dark:text-slate-400">No clips saved in this replay yet.</div> : null}
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Distribution targets</div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {([
                    ["campaigns", "Campaign handoff"],
                    ["social", "Social distribution"],
                    ["assetLibrary", "Asset library"]
                  ] as Array<[keyof ExportTargets, string]>).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setExportTargets((current) => ({ ...current, [key]: !current[key] }))}
                      className={cx(
                        "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold",
                        exportTargets[key]
                          ? "border-[#f77f00] bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                      )}
                    >
                      <span>{label}</span>
                      {exportTargets[key] ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={handleExportClip} className="inline-flex items-center gap-2 rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white">
                    <Library className="h-4 w-4" />
                    Export clip
                  </button>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
                    Export uses backend replay state first, then optionally creates an Asset Library record.
                  </div>
                </div>
              </div>
            </SectionCard>

            {selectedReplay ? (
              <SectionCard title="Replay metrics" subtitle="Values below are being read from the backend replay payload.">
                <div className="grid gap-4 md:grid-cols-4">
                  <MetricTile label="Views" value={numberValue(selectedReplay, "views").toLocaleString()} />
                  <MetricTile label="Sales" value={numberValue(selectedReplay, "sales").toLocaleString()} />
                  <MetricTile label="Duration" value={secondsToLabel(numberValue(selectedReplay, "durationSec"))} />
                  <MetricTile label="Revenue" value={formatCurrency("USD", numberValue(selectedReplay, "sales") * 12)} hint="Demo revenue projection" />
                </div>
              </SectionCard>
            ) : null}
          </div>
        </section>
      </main>

      {shareReplay ? <ReplayShareDrawer replay={shareReplay} onClose={() => setShareReplay(null)} /> : null}
    </div>
  );
}

export { LiveReplaysClipsPage };
