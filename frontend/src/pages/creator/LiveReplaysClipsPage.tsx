// Round 5 – Page 15: Live Replays & Clips Library (Creator View)
// Purpose: Manage recordings and generate highlight clips.
// Sections:
// 1) Replay list (thumbnail, title, date, views, sales, publish/private)
// 2) Clip editor (timeline scrubber, in/out handles, overlay text, CTA stickers)
// 3) Distribution panel (export to campaigns, social, asset library)
// Premium extras: AI auto clip suggestions, performance tags per clip.

import React, { useEffect, useMemo, useState } from "react";


import { PageHeader } from "../../components/PageHeader";
import { backendApi, type LiveReplayRecord } from "../../lib/api";
import { QRCodeCanvas } from "qrcode.react";

type Replay = {
  id: string;
  title: string;
  date: string;
  views: number;
  sales: number;
  duration: string;
  status: string;
  thumbColor: string;
  performanceTags: string[];
};

type ClipSuggestion = {
  id: number;
  label: string;
  start: number;
  end: number;
  tags: string[];
};

type ExportTargets = {
  campaigns: boolean;
  social: boolean;
  assetLibrary: boolean;
};

const FALLBACK_REPLAYS: Replay[] = [
  {
    id: "R-101",
    title: "Autumn Beauty Flash – Serum launch",
    date: "Oct 10, 2025",
    views: 1543,
    sales: 62,
    duration: "01:12:45",
    status: "Published",
    thumbColor: "bg-rose-100",
    performanceTags: ["Strong hook", "High retention", "Serum focus"]
  },
  {
    id: "R-102",
    title: "Tech Friday Mega Live – Gadgets Q&A",
    date: "Oct 11, 2025",
    views: 2310,
    sales: 87,
    duration: "01:28:03",
    status: "Draft replay",
    thumbColor: "bg-sky-100",
    performanceTags: ["Q&A heavy", "Late peak", "Bundle upsells"]
  },
  {
    id: "R-103",
    title: "Faith & Wellness Morning Dealz",
    date: "Oct 12, 2025",
    views: 987,
    sales: 29,
    duration: "00:54:10",
    status: "Published",
    thumbColor: "bg-emerald-100",
    performanceTags: ["Soft opener", "High replay", "Community chat"]
  }
];

const colorPool = ["bg-rose-100", "bg-sky-100", "bg-emerald-100", "bg-amber-100", "bg-indigo-100"];

const formatDuration = (durationSec?: number): string => {
  if (!durationSec || Number.isNaN(durationSec)) return "00:00:00";
  const hrs = Math.floor(durationSec / 3600).toString().padStart(2, "0");
  const mins = Math.floor((durationSec % 3600) / 60).toString().padStart(2, "0");
  const secs = Math.floor(durationSec % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
};

const mapBackendReplay = (entry: LiveReplayRecord, index: number): Replay => ({
  id: String(entry.id || entry.sessionId || `replay_${index + 1}`),
  title: entry.title || `Replay ${index + 1}`,
  date: entry.date
    ? new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })
    : "Unknown date",
  views: Number(entry.views ?? 0),
  sales: Number(entry.sales ?? 0),
  duration: formatDuration(Number(entry.durationSec ?? 0)),
  status: entry.published ? "Published" : entry.status || "Draft replay",
  thumbColor: colorPool[index % colorPool.length],
  performanceTags: Array.isArray(entry.notes) && entry.notes.length ? entry.notes.slice(0, 3) : ["Replay ready"]
});


function LiveReplaysClipsPage() {

  const [selectedReplayId, setSelectedReplayId] = useState(FALLBACK_REPLAYS[0]?.id || "");
  const [shareReplay, setShareReplay] = useState<Replay | null>(null); // State for sharing modal
  const [clipStart, setClipStart] = useState(30); // seconds
  const [clipEnd, setClipEnd] = useState(90); // seconds
  const [overlayText, setOverlayText] = useState(
    "GlowUp Serum – 20% OFF today only"
  );
  const [ctaSticker, setCtaSticker] = useState("Tap to shop");
  const [exportTargets, setExportTargets] = useState<ExportTargets>({
    campaigns: true,
    social: true,
    assetLibrary: true
  });
  const [backendError, setBackendError] = useState<string | null>(null);

  const [replays, setReplays] = useState<Replay[]>(FALLBACK_REPLAYS);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const rows = await backendApi.getLiveReplays();
        if (!isMounted) return;
        if (rows.length) {
          setReplays(rows.map(mapBackendReplay));
        } else {
          setReplays(FALLBACK_REPLAYS);
        }
        setBackendError(null);
      } catch (error) {
        if (!isMounted) return;
        setReplays(FALLBACK_REPLAYS);
        setBackendError(error instanceof Error ? error.message : "Unable to load replays.");
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (replays.length === 0) return;
    if (!replays.some((replay) => replay.id === selectedReplayId)) {
      setSelectedReplayId(replays[0].id);
    }
  }, [replays, selectedReplayId]);

  const selectedReplay =
    replays.find((r) => r.id === selectedReplayId) || replays[0] || null;

  const aiClipSuggestions = useMemo(() => {
    if (!selectedReplay) return [];
    // Simple demo: different suggestions depending on replay
    if (selectedReplay.id === "R-101") {
      return [
        {
          id: 1,
          label: "Hook + first serum demo",
          start: 15,
          end: 75,
          tags: ["Hook within first 3 seconds", "Texture demo"]
        },
        {
          id: 2,
          label: "Before/after reveal",
          start: 420,
          end: 465,
          tags: ["Visual proof", "High comment volume"]
        },
        {
          id: 3,
          label: "Flash deal countdown",
          start: 900,
          end: 945,
          tags: ["Urgency", "Sales spike"]
        }
      ];
    }
    if (selectedReplay.id === "R-102") {
      return [
        {
          id: 1,
          label: "Gadget unboxing moment",
          start: 120,
          end: 180,
          tags: ["Unboxing", "Reactions spike"]
        },
        {
          id: 2,
          label: "Top 3 gadgets summary",
          start: 2100,
          end: 2160,
          tags: ["Summary", "Shareable"]
        }
      ];
    }
    return [
      {
        id: 1,
        label: "Warm welcome + show outline",
        start: 30,
        end: 90,
        tags: ["Warm opener", "Faith-compatible tone"]
      }
    ];
  }, [selectedReplay]);

  const handleApplySuggestion = (suggestion: ClipSuggestion): void => {
    setClipStart(suggestion.start);
    setClipEnd(suggestion.end);
  };

  const handleToggleExportTarget = (key: keyof ExportTargets): void => {
    setExportTargets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const secondsToTime = (s: number): string => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handlePublishReplay = (id: string): void => {
    setReplays((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Published" } : r))
    );
    backendApi.publishReplay(id, {}).catch((error) => {
      setBackendError(error instanceof Error ? error.message : "Failed to publish replay.");
    });
  };

  const handleSetPrivate = (id: string): void => {
    setReplays((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Private" } : r))
    );
    backendApi.updateReplay(id, { published: false, status: "private" }).catch((error) => {
      setBackendError(error instanceof Error ? error.message : "Failed to update replay.");
    });
  };

  const handleExportClip = () => {
    const targets = Object.entries(exportTargets)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ");

    // Create detailed export content
    const exportContent = [
      `EXPORT SUMMARY`,
      `--------------`,
      `Replay: ${selectedReplay?.title || "Unknown"}`,
      `Date: ${new Date().toLocaleString()}`,
      ``,
      `CLIP DETAILS`,
      `------------`,
      `Start Time: ${secondsToTime(clipStart)}`,
      `End Time: ${secondsToTime(clipEnd)}`,
      `Duration: ${secondsToTime(clipEnd - clipStart)}`,
      ``,
      `OVERLAYS`,
      `--------`,
      `Text: "${overlayText}"`,
      `CTA Sticker: "${ctaSticker}"`,
      ``,
      `DISTRIBUTION TARGETS`,
      `--------------------`,
      targets || "None selected",
      ``,
      `[Files generated and sent to processing pipeline]`
    ].join("\n");

    // Generate blob and download
    const blob = new Blob([exportContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clip_export_${selectedReplay?.id || "draft"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Live Replays & Clips"
        mobileViewType="hide"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-800 transition-colors">
            <span>🎞️</span>
            <span>Replays · Clips · Distribution</span>
          </span>
        }
      />

      <main className="flex-1 flex flex-col w-full p-4 sm:p-6 lg:p-8 pt-6 gap-6 overflow-y-auto overflow-x-hidden">
        {backendError ? (
          <section className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Backend data fallback: {backendError}
          </section>
        ) : null}

        <div className="w-full max-w-full grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)] gap-4 items-start">
          {/* Left: Replays + AI suggestions */}
          <section className="flex flex-col gap-3">
            {/* Replay list */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 text-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Live replays</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    Manage recordings and quickly turn them into highlight clips or full replays.
                  </p>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-300">
                  {replays.length} recordings
                </span>
              </div>
              <div className="space-y-1 max-h-[320px] overflow-y-auto">
                {replays.map((r) => (
                  <ReplayRow
                    key={r.id}
                    replay={r}
                    active={selectedReplay && selectedReplay.id === r.id}
                    onSelect={() => setSelectedReplayId(r.id)}
                    onPublish={() => handlePublishReplay(r.id)}
                    onSetPrivate={() => handleSetPrivate(r.id)}
                    onShare={() => setShareReplay(r)}
                  />
                ))}
              </div>
            </div>

            {/* AI clip suggestions */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 text-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <div>
                    <h3 className="text-xs font-semibold dark:font-bold">AI clip suggestions</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      Top high-engagement moments detected in this replay.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-400">
                  Replay: {selectedReplay ? selectedReplay.title : "None"}
                </span>
              </div>
              {aiClipSuggestions.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Not enough data to suggest clips for this replay yet.
                </p>
              ) : (
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {aiClipSuggestions.map((s) => (
                    <li
                      key={s.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 flex items-start justify-between gap-2 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold dark:font-bold">
                            {s.label}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-300">
                            {secondsToTime(s.start)}–{secondsToTime(s.end)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-tiny text-slate-700 dark:text-slate-100 font-medium transition-colors"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        className="px-2.5 py-1 rounded-full bg-[#f77f00] text-white text-xs font-semibold dark:font-bold hover:bg-[#e26f00]"
                        onClick={() => handleApplySuggestion(s)}
                      >
                        Use as clip
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Right: Clip editor + distribution */}
          <section className="flex flex-col gap-3">
            <ClipEditorPanel
              replay={selectedReplay}
              clipStart={clipStart}
              clipEnd={clipEnd}
              onChangeStart={setClipStart}
              onChangeEnd={setClipEnd}
              overlayText={overlayText}
              onChangeOverlay={setOverlayText}
              ctaSticker={ctaSticker}
              onChangeCta={setCtaSticker}
              secondsToTime={secondsToTime}
            />
            <DistributionPanel
              exportTargets={exportTargets}
              onToggleTarget={handleToggleExportTarget}
              onExport={handleExportClip}
            />
          </section>
        </div>
      </main>

      {/* Share Drawer */}
      {shareReplay && (
        <ShareReplayDrawer
          replay={shareReplay}
          onClose={() => setShareReplay(null)}
        />
      )}
    </div>
  );
}

/* Share Drawer Component */
function ShareReplayDrawer({ replay, onClose }: { replay: Replay; onClose: () => void }) {
  const [qrOpen, setQrOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://mylivedealz.com/replay/${replay.id}`);
    setToast("Replay link copied!");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-sm transition-colors animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold dark:font-bold">Share Replay</h3>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="font-medium mb-1">{replay.title}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {replay.date} · {replay.duration}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              onClick={handleCopyLink}
            >
              <span>🔗</span> Copy Replay Link
            </button>
            <button
              className={`w-full py-2.5 rounded-xl border font-medium transition-colors flex items-center justify-center gap-2 ${qrOpen
                ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              onClick={() => setQrOpen(!qrOpen)}
            >
              <span>📱</span> {qrOpen ? "Hide QR Code" : "Show QR Code"}
            </button>
          </div>

          {qrOpen && (
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl animate-fade-in-down">
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <QRCodeCanvas
                  value={`https://mylivedealz.com/replay/${replay.id}`}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="Q"
                />
              </div>
              <div className="text-sm font-medium mt-2 text-slate-800 dark:text-slate-200">
                Scan to watch replay
              </div>
            </div>
          )}
        </div>

        {toast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full text-xs shadow-lg animate-fade-in-up">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

/* Replay row */
type ReplayRowProps = {
  replay: Replay;
  active: boolean;
  onSelect: () => void;
  onPublish: () => void;
  onSetPrivate: () => void;
  onShare: () => void;
};

function ReplayRow({ replay, active, onSelect, onPublish, onSetPrivate, onShare }: ReplayRowProps) {
  return (
    <div
      className={`border rounded-2xl px-2.5 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 cursor-pointer transition-colors ${active
        ? "border-[#f77f00] bg-amber-50/40 dark:bg-amber-900/30"
        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700"
        }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <div
          className={`h-10 w-10 rounded-lg ${replay.thumbColor} flex items-center justify-center text-md`}
        >
          🎥
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-50 line-clamp-2">
            {replay.title}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-300">
            {replay.date} · {replay.duration}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-300">
            Views:{" "}
            <span className="font-medium">
              {replay.views.toLocaleString()}
            </span>{" "}
            · Sales:{" "}
            <span className="font-medium">
              {replay.sales.toLocaleString()}
            </span>
          </span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {replay.performanceTags.map((tag: string) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-tiny text-slate-600 dark:text-slate-200 font-medium transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 md:flex-col md:items-end">
        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-tiny mb-0.5">
          {replay.status}
        </span>
        <div className="flex gap-1 text-xs">
          <button
            className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onPublish();
            }}
          >
            Publish as replay
          </button>
          <button
            className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onSetPrivate();
            }}
          >
            Set to private
          </button>
          <button
            className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

/* Clip editor panel */
type ClipEditorPanelProps = {
  replay: Replay | null;
  clipStart: number;
  clipEnd: number;
  onChangeStart: (value: number) => void;
  onChangeEnd: (value: number) => void;
  overlayText: string;
  onChangeOverlay: (value: string) => void;
  ctaSticker: string;
  onChangeCta: (value: string) => void;
  secondsToTime: (s: number) => string;
};

function ClipEditorPanel({
  replay,
  clipStart,
  clipEnd,
  onChangeStart,
  onChangeEnd,
  overlayText,
  onChangeOverlay,
  ctaSticker,
  onChangeCta,
  secondsToTime
}: ClipEditorPanelProps) {
  const totalDurationSec = 1200; // pretend 20 min timeline for demo
  const clamp = (val: number): number => Math.min(Math.max(val, 0), totalDurationSec);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = clamp(Number(e.target.value) || 0);
    if (v >= clipEnd) return;
    onChangeStart(v);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = clamp(Number(e.target.value) || 0);
    if (v <= clipStart) return;
    onChangeEnd(v);
  };

  const startPercent = (clipStart / totalDurationSec) * 100;
  const endPercent = (clipEnd / totalDurationSec) * 100;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Clip editor</h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Choose a segment, add overlays and a call to action.
          </p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-300">
          {replay ? replay.title : "No replay selected"}
        </span>
      </div>

      {/* Timeline scrubber */}
      {/* Timeline scrubber */}
      <div className="flex flex-col gap-1 select-none">
        <div
          className="relative h-8 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center px-2 transition-colors cursor-pointer"
          ref={(el) => {
            if (!el) return;
            // Click on track to jump closest handle
            el.onclick = (e) => {
              const rect = el.getBoundingClientRect();
              const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
              const percent = (x / rect.width) * 100;
              const time = Math.round((percent / 100) * totalDurationSec);

              const distStart = Math.abs(time - clipStart);
              const distEnd = Math.abs(time - clipEnd);

              if (distStart < distEnd) {
                if (time < clipEnd) onChangeStart(time);
              } else {
                if (time > clipStart) onChangeEnd(time);
              }
            };
          }}
        >
          <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors pointer-events-none">
            <div
              className="absolute h-1 bg-[#f77f00] rounded-full"
              style={{
                left: `${startPercent}%`,
                width: `${Math.max(0, endPercent - startPercent)}%`
              }}
            />
          </div>
          {/* Start handle */}
          <div
            className="absolute h-5 w-5 rounded-full bg-white dark:bg-slate-900 border-2 border-[#f77f00] shadow-md -mt-0.5 cursor-ew-resize transition-transform hover:scale-110 z-10"
            style={{ left: `calc(${startPercent}% - 6px)` }} // Adjusted for center alignment
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startVal = clipStart;

              const onMove = (moveEvent: MouseEvent) => {
                const parent = (e.target as HTMLElement).parentElement;
                if (!parent) return;
                const rect = parent.getBoundingClientRect();
                const deltaX = moveEvent.clientX - startX;
                const deltaPercent = (deltaX / rect.width);
                const deltaTime = deltaPercent * totalDurationSec;

                const newVal = clamp(Math.round(startVal + deltaTime));
                if (newVal < clipEnd - 5) { // Min 5s gap
                  onChangeStart(newVal);
                }
              };

              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };

              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              const startX = touch.clientX;
              const startVal = clipStart;

              const onMove = (moveEvent: TouchEvent) => {
                const moveTouch = moveEvent.touches[0];
                const parent = (e.target as HTMLElement).parentElement;
                if (!parent) return;
                const rect = parent.getBoundingClientRect();
                const deltaX = moveTouch.clientX - startX;
                const deltaPercent = (deltaX / rect.width);
                const deltaTime = deltaPercent * totalDurationSec;

                const newVal = clamp(Math.round(startVal + deltaTime));
                if (newVal < clipEnd - 5) {
                  onChangeStart(newVal);
                }
              };

              const onEnd = () => {
                window.removeEventListener('touchmove', onMove);
                window.removeEventListener('touchend', onEnd);
              };

              window.addEventListener('touchmove', onMove);
              window.addEventListener('touchend', onEnd);
            }}
          />
          {/* End handle */}
          <div
            className="absolute h-5 w-5 rounded-full bg-white dark:bg-slate-900 border-2 border-[#f77f00] shadow-md -mt-0.5 cursor-ew-resize transition-transform hover:scale-110 z-10"
            style={{ left: `calc(${endPercent}% - 6px)` }} // Adjusted for center alignment
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startVal = clipEnd;

              const onMove = (moveEvent: MouseEvent) => {
                const parent = (e.target as HTMLElement).parentElement;
                if (!parent) return;
                const rect = parent.getBoundingClientRect();
                const deltaX = moveEvent.clientX - startX;
                const deltaPercent = (deltaX / rect.width);
                const deltaTime = deltaPercent * totalDurationSec;

                const newVal = clamp(Math.round(startVal + deltaTime));
                if (newVal > clipStart + 5) { // Min 5s gap
                  onChangeEnd(newVal);
                }
              };

              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };

              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              const startX = touch.clientX;
              const startVal = clipEnd;

              const onMove = (moveEvent: TouchEvent) => {
                const moveTouch = moveEvent.touches[0];
                const parent = (e.target as HTMLElement).parentElement;
                if (!parent) return;
                const rect = parent.getBoundingClientRect();
                const deltaX = moveTouch.clientX - startX;
                const deltaPercent = (deltaX / rect.width);
                const deltaTime = deltaPercent * totalDurationSec;

                const newVal = clamp(Math.round(startVal + deltaTime));
                if (newVal > clipStart + 5) {
                  onChangeEnd(newVal);
                }
              };

              const onEnd = () => {
                window.removeEventListener('touchmove', onMove);
                window.removeEventListener('touchend', onEnd);
              };

              window.addEventListener('touchmove', onMove);
              window.addEventListener('touchend', onEnd);
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300 mt-0.5">
          <span>
            Start:{" "}
            <span className="font-medium">
              {secondsToTime(clipStart)} ({clipStart}s)
            </span>
          </span>
          <span>
            End:{" "}
            <span className="font-medium">
              {secondsToTime(clipEnd)} ({clipEnd}s)
            </span>
          </span>
          <span>
            Duration:{" "}
            <span className="font-medium">
              {secondsToTime(clipEnd - clipStart)}
            </span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-600 dark:text-slate-200 font-medium">
              Start (seconds)
            </label>
            <input
              type="number"
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
              value={clipStart}
              onChange={handleStartChange}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-600 dark:text-slate-200 font-medium">End (seconds)</label>
            <input
              type="number"
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
              value={clipEnd}
              onChange={handleEndChange}
            />
          </div>
        </div>
      </div>

      {/* Overlay text + CTA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
        <div className="flex flex-col gap-1">
          <label className="font-medium">Overlay text</label>
          <textarea
            rows={3}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none resize-none transition-colors"
            value={overlayText}
            onChange={(e) => onChangeOverlay(e.target.value)}
            placeholder="Short title or tagline for the clip…"
          />
          <p className="text-xs text-slate-500 dark:text-slate-300">
            This will appear as text over the clip (top or bottom, depending on layout).
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-medium">Call to action sticker</label>
          <input
            className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-900 focus:border-slate-400 outline-none transition-colors"
            value={ctaSticker}
            onChange={(e) => onChangeCta(e.target.value)}
            placeholder="Tap to shop, Learn more, Watch full live…"
          />
          <p className="text-xs text-slate-500 dark:text-slate-300">
            This will be used as a clickable sticker for campaigns and social exports.
          </p>
        </div>
      </div>
    </div>
  );
}

/* Distribution panel */
type DistributionPanelProps = {
  exportTargets: ExportTargets;
  onToggleTarget: (key: keyof ExportTargets) => void;
  onExport: () => void;
};

function DistributionPanel({ exportTargets, onToggleTarget, onExport }: DistributionPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Distribution</h3>
        <span className="text-xs text-slate-500 dark:text-slate-300">
          Choose where this clip will go
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <DistributionToggle
          label="Campaigns"
          description="Attach as a highlight to campaign pages and MyLiveDealz promo slots."
          active={exportTargets.campaigns}
          onToggle={() => onToggleTarget("campaigns")}
        />
        <DistributionToggle
          label="Social media"
          description="Prepare exports for platforms like Instagram, TikTok, YouTube Shorts."
          active={exportTargets.social}
          onToggle={() => onToggleTarget("social")}
        />
        <DistributionToggle
          label="Asset Library"
          description="Save as a reusable asset for future lives and Shoppable Adz."
          active={exportTargets.assetLibrary}
          onToggle={() => onToggleTarget("assetLibrary")}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-500 dark:text-slate-300 max-w-sm">
          In the full Studio, each target would open a more detailed export config (format, ratio,
          caption templates).
        </p>
        <button
          className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold dark:font-bold hover:bg-[#e26f00]"
          onClick={onExport}
        >
          Export clip
        </button>
      </div>
    </div>
  );
}

type DistributionToggleProps = {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
};

function DistributionToggle({ label, description, active, onToggle }: DistributionToggleProps) {
  return (
    <button
      type="button"
      className={`w-full text-left border rounded-xl px-2.5 py-2 flex flex-col gap-1 ${active
        ? "bg-[#f77f00]/10 border-[#f77f00] text-slate-900 dark:text-slate-100"
        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700"
        }`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold dark:font-bold">{label}</span>
        <span className="text-xs">
          {active ? (
            <span className="text-emerald-600">Included</span>
          ) : (
            <span className="text-slate-400 dark:text-slate-400">Not included</span>
          )}
        </span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">{description}</p>
    </button>
  );
}

export { LiveReplaysClipsPage };
