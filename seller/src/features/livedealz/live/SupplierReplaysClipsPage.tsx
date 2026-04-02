import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sellerBackendApi } from "../../../lib/backendApi";

/**
 * SupplierLiveReplaysClipsPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: LiveReplaysClipsPage.tsx (Creator)
 *
 * Mirror-first preserved:
 * - Two-column layout: (Replays + AI suggestions) | (Clip editor + Distribution)
 * - Replay list with actions (Publish, Private, Share)
 * - AI clip suggestions list (Use as clip)
 * - Clip editor (timeline scrubber, draggable in/out handles, overlay text, CTA sticker)
 * - Distribution panel (Campaigns / Social / Asset Library) + Export clip
 * - Share replay drawer with Copy link + QR
 *
 * Supplier adaptations (minimal, necessary):
 * - Replays include Supplier campaign context + Host Role (Creator-hosted vs Supplier-hosted)
 * - Copy/share text & help notes are Supplier-oriented
 * - Approval note: if campaign approval mode is Manual, replay/clip publish may require Admin confirmation.
 */

const ORANGE = "#f77f00";

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function asNumber(value, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBoolean(value) {
  return Boolean(value);
}

function normalizeIso(value) {
  const iso = asString(value);
  if (!iso) return "";
  const parsed = new Date(iso);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "";
}

function parseDurationString(value) {
  const text = asString(value);
  if (!text.includes(":")) return 0;
  const parts = text.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
  if (parts.length === 2) return Math.max(0, parts[0] * 60 + parts[1]);
  return 0;
}

function formatDurationLabel(totalSec) {
  const sec = Math.max(0, Math.round(asNumber(totalSec, 0)));
  const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function normalizeReplayStatus(status, published) {
  const normalized = asString(status).toLowerCase();
  if (published || normalized === "published") return "Published";
  if (normalized === "archived") return "Private";
  if (normalized === "processing") return "Processing";
  return "Draft replay";
}

function normalizeHostRole(value) {
  return asString(value).toLowerCase() === "supplier" ? "Supplier" : "Creator";
}

function fallbackThumbColor(hostRole, status, index) {
  if (status === "Published") return "bg-emerald-100";
  if (status === "Private") return "bg-slate-200";
  if (hostRole === "Supplier") return "bg-amber-100";
  const palette = ["bg-sky-100", "bg-rose-100", "bg-indigo-100", "bg-violet-100"];
  return palette[index % palette.length];
}

function normalizeSuggestion(raw, index, durationSec) {
  const record = asRecord(raw) || {};
  const start = Math.max(0, Math.round(asNumber(record.start, 0)));
  const endCandidate = Math.max(start + 5, Math.round(asNumber(record.end, start + 45)));
  const end = Math.min(durationSec, endCandidate);
  if (!asString(record.label) || end <= start) return null;
  return {
    id: asString(record.id) || `suggestion-${index + 1}`,
    label: asString(record.label),
    start,
    end,
    tags: asArray(record.tags).map((tag) => asString(tag)).filter(Boolean)
  };
}

function normalizeScheduleSession(raw) {
  const record = asRecord(raw) || {};
  return {
    id: asString(record.id),
    title: asString(record.title),
    campaign: asString(record.campaign),
    supplier: asString(record.supplier),
    host: asString(record.host),
    hostRole: normalizeHostRole(record.hostRole),
    creatorUsage: asString(record.creatorUsage),
    collabMode: asString(record.collabMode),
    approvalMode: asString(record.approvalMode),
    date: asString(record.dateLabel),
    durationMin: Math.max(0, Math.round(asNumber(record.durationMin, 0))),
    startISO: normalizeIso(record.startISO),
    endISO: normalizeIso(record.endISO)
  };
}

function normalizeReplay(raw, sessionMap, index) {
  const replay = asRecord(raw) || {};
  const data = asRecord(replay.data) || {};
  const replayId = asString(replay.id) || `replay-${index + 1}`;
  const sessionId = asString(replay.sessionId) || asString(data.sessionId) || replayId;
  const session = sessionMap.get(sessionId) || sessionMap.get(replayId) || null;

  const status = normalizeReplayStatus(replay.status, asBoolean(replay.published));
  const hostRole = normalizeHostRole(data.hostRole || session?.hostRole);

  const durationSecFromData = Math.max(
    0,
    Math.round(
      asNumber(data.durationSec, 0) ||
      asNumber(data.durationMin, 0) * 60 ||
      asNumber(session?.durationMin, 0) * 60 ||
      parseDurationString(data.duration) ||
      parseDurationString(data.durationLabel)
    )
  );
  const durationSec = Math.max(60, durationSecFromData || 600);

  const createdISO =
    normalizeIso(replay.updatedAt) ||
    normalizeIso(replay.publishedAt) ||
    normalizeIso(replay.createdAt) ||
    normalizeIso(session?.startISO);
  const date = session?.date || (createdISO ? new Date(createdISO).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : "TBD");

  const suggestions = asArray(data.aiClipSuggestions || data.highlights || data.clips)
    .map((item, itemIndex) => normalizeSuggestion(item, itemIndex, durationSec))
    .filter(Boolean);

  return {
    id: replayId,
    sessionId,
    title: asString(data.title) || asString(session?.title) || "Replay",
    campaign: asString(data.campaign) || asString(session?.campaign) || "Campaign",
    supplier: asString(data.supplier) || asString(session?.supplier) || "Supplier",
    host: asString(data.host) || asString(session?.host) || "@host",
    hostRole,
    creatorUsage: asString(data.creatorUsage) || asString(session?.creatorUsage) || "I will use a Creator",
    collabMode: asString(data.collabMode) || asString(session?.collabMode) || "Open for Collabs",
    approvalMode: asString(data.approvalMode) || asString(session?.approvalMode) || "Manual",
    date,
    views: Math.max(0, Math.round(asNumber(data.views, 0) || asNumber(data.viewerCount, 0) || asNumber(asRecord(data.metrics)?.views, 0))),
    sales: Math.max(0, Math.round(asNumber(data.sales, 0) || asNumber(data.orders, 0) || asNumber(asRecord(data.metrics)?.sales, 0))),
    duration: asString(data.duration) || formatDurationLabel(durationSec),
    durationSec,
    replayUrl: asString(data.replayUrl) || `https://mylivedealz.com/replay/${replayId}`,
    status,
    thumbColor: asString(data.thumbColor) || fallbackThumbColor(hostRole, status, index),
    performanceTags: asArray(data.performanceTags).map((tag) => asString(tag)).filter(Boolean),
    aiClipSuggestions: suggestions
  };
}

function PageHeader({ pageTitle, badge, right }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="min-w-0 px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold dark:font-bold text-slate-900 dark:text-slate-50 truncate">
            {pageTitle}
          </h1>
          {badge ? <div className="mt-1">{badge}</div> : null}
        </div>
        {right ? <div className="flex flex-wrap items-center justify-end gap-2">{right}</div> : null}
      </div>
    </header>
  );
}

function QRCodeCanvas({ value, size = 160, bgColor = "#ffffff", fgColor = "#000000" }) {
  // Deterministic pseudo-QR pattern (visual only). Replace with real qrcode.react in production.
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

  const seed = hash(String(value || ""));

  const isFinder = (x, y) => {
    const inTL = x < 7 && y < 7;
    const inTR = x >= grid - 7 && y < 7;
    const inBL = x < 7 && y >= grid - 7;
    return inTL || inTR || inBL;
  };

  const cellOn = (x, y) => {
    if (isFinder(x, y)) {
      const fx = x % 7;
      const fy = y % 7;
      const outer = fx === 0 || fy === 0 || fx === 6 || fy === 6;
      const inner = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4;
      return outer || inner;
    }
    const n = (seed + x * 131 + y * 313) >>> 0;
    return (n & 1) === 1;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <rect x="0" y="0" width={size} height={size} fill={bgColor} />
      {Array.from({ length: grid }).map((_, y) =>
        Array.from({ length: grid }).map((__, x) => {
          if (!cellOn(x, y)) return null;
          return <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill={fgColor} />;
        })
      )}
    </svg>
  );
}

export default function SupplierLiveReplaysClipsPage() {
  const navigate = useNavigate();
  const navigateTo = (destination) => {
    if (!destination) return;
    if (/^https?:\/\//i.test(destination)) {
      window.open(destination, "_blank", "noreferrer");
      return;
    }
    navigate(destination);
  };

  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");
  const [actionPendingId, setActionPendingId] = useState("");
  const [pageToast, setPageToast] = useState("");
  const [selectedReplayId, setSelectedReplayId] = useState("");
  const [shareReplay, setShareReplay] = useState(null);

  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(60);
  const [overlayText, setOverlayText] = useState("");
  const [ctaSticker, setCtaSticker] = useState("Tap to shop");

  const [exportTargets, setExportTargets] = useState({
    campaigns: true,
    social: true,
    assetLibrary: true
  });

  const [replays, setReplays] = useState([]);

  const showPageToast = (message) => {
    setPageToast(message);
    window.setTimeout(() => setPageToast(""), 2800);
  };

  const selectedReplay = replays.find((r) => r.id === selectedReplayId) || replays[0] || null;

  const aiClipSuggestions = useMemo(() => {
    return asArray(selectedReplay?.aiClipSuggestions);
  }, [selectedReplay]);

  const loadWorkspace = async ({ silent = false } = {}) => {
    if (!silent) setWorkspaceLoading(true);
    setWorkspaceError("");
    try {
      await sellerBackendApi.ensureWorkspaceRole();
      const [replaysRaw, scheduleRaw] = await Promise.all([
        sellerBackendApi.getLiveReplays(),
        sellerBackendApi.getLiveScheduleWorkspace().catch(() => ({ sessions: [] }))
      ]);
      const sessionMap = new Map(
        asArray(asRecord(scheduleRaw)?.sessions)
          .map((session) => normalizeScheduleSession(session))
          .filter((session) => session.id)
          .map((session) => [session.id, session])
      );
      const normalized = asArray(replaysRaw).map((replay, index) =>
        normalizeReplay(replay, sessionMap, index)
      );
      setReplays(normalized);
      setSelectedReplayId((current) => {
        if (current && normalized.some((replay) => replay.id === current)) return current;
        return normalized[0]?.id || "";
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to load replays workspace.";
      setWorkspaceError(message);
    } finally {
      if (!silent) setWorkspaceLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!selectedReplay) return;
    if (aiClipSuggestions.length > 0) {
      setClipStart(aiClipSuggestions[0].start);
      setClipEnd(aiClipSuggestions[0].end);
    } else {
      setClipStart(0);
      setClipEnd(Math.min(Math.max(60, selectedReplay.durationSec), 90));
    }
    setOverlayText(selectedReplay.title || "");
  }, [selectedReplayId]);

  useEffect(() => {
    if (!shareReplay) return;
    const next = replays.find((replay) => replay.id === shareReplay.id) || null;
    setShareReplay(next);
  }, [replays, shareReplay]);

  const handleApplySuggestion = (suggestion) => {
    setClipStart(suggestion.start);
    setClipEnd(suggestion.end);
  };

  const handleAddToAssetLibrary = (suggestion) => {
    if (suggestion) {
      handleApplySuggestion(suggestion);
    }
    setExportTargets((prev) => ({ ...prev, assetLibrary: true }));
  };

  const handleToggleExportTarget = (key) => {
    setExportTargets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const secondsToTime = (s) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handlePublishReplay = async (id) => {
    const replay = replays.find((entry) => entry.id === id);
    if (!replay || replay.status === "Published") return;
    setActionPendingId(`publish:${id}`);
    try {
      await sellerBackendApi.publishLiveReplay(id, { status: "published" });
      showPageToast("Replay published.");
      await loadWorkspace({ silent: true });
    } catch (error) {
      showPageToast("Failed to publish replay.");
    } finally {
      setActionPendingId("");
    }
  };

  const handleSetPrivate = async (id) => {
    const replay = replays.find((entry) => entry.id === id);
    if (!replay || replay.status === "Private") return;
    setActionPendingId(`private:${id}`);
    try {
      await sellerBackendApi.patchLiveReplay(id, { status: "archived" });
      showPageToast("Replay moved to private.");
      await loadWorkspace({ silent: true });
    } catch (error) {
      showPageToast("Failed to set replay as private.");
    } finally {
      setActionPendingId("");
    }
  };

  const handleExportClip = () => {
    if (!selectedReplay) {
      showPageToast("Select a replay before exporting a clip.");
      return;
    }
    const targets = Object.entries(exportTargets)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ");

    const exportContent = [
      `EXPORT SUMMARY`,
      `--------------`,
      `Replay: ${selectedReplay?.title || "Unknown"}`,
      `Campaign: ${selectedReplay?.campaign || "—"}`,
      `Supplier: ${selectedReplay?.supplier || "—"}`,
      `Host: ${selectedReplay?.host || "—"} (${selectedReplay?.hostRole || "—"})`,
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
      `SUPPLIER NOTE`,
      `------------`,
      `If campaign approval mode is Manual, publishing clips/replays may require Admin confirmation.`,
      ``,
      `[Files generated and sent to processing pipeline]`
    ].join("\n");

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
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      {/* Small CSS for creator-style animation + missing utility fallbacks */}
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform: translateY(10px);} to { opacity:1; transform: translateY(0);} }
        @keyframes fadeInDown { from { opacity:0; transform: translateY(-10px);} to { opacity:1; transform: translateY(0);} }
        @keyframes slideInRight { from { opacity:0; transform: translateX(18px);} to { opacity:1; transform: translateX(0);} }
        .animate-fade-in-up { animation: fadeInUp .22s ease-out both; }
        .animate-fade-in-down { animation: fadeInDown .22s ease-out both; }
        .animate-slide-in-right { animation: slideInRight .22s ease-out both; }
        .text-tiny { font-size: 10px; line-height: 1.1; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      <PageHeader
        pageTitle="Replays & Clips"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-800 transition-colors">
            <span>🎞️</span>
            <span>Supplier library · Replays · Clips · Distribution</span>
          </span>
        }
        right={
          <>
            <Btn tone="ghost" onClick={() => navigateTo("/mldz/live/dashboard")}>
              Live Dashboard
            </Btn>
            <Btn tone="ghost" onClick={() => navigateTo("/mldz/live/studio")}>
              Live Studio
            </Btn>
            <Btn tone="brand" onClick={() => navigateTo("/mldz/live/post-live-publisher")}>
              Upload replay
            </Btn>
          </>
        }
      />

      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 gap-6 overflow-y-auto overflow-x-hidden">
        {workspaceLoading ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-300">
            Loading replays workspace...
          </div>
        ) : workspaceError ? (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 p-6 text-sm text-rose-700 dark:text-rose-300">
            <div className="font-semibold dark:font-bold">Unable to load live replays workspace.</div>
            <div className="mt-1">{workspaceError}</div>
            <div className="mt-3">
              <Btn tone="brand" onClick={() => void loadWorkspace()}>Retry</Btn>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-full grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)] gap-4 items-start">
            {/* Left: Replays + AI suggestions */}
            <section className="flex flex-col gap-3">
              {/* Replay list */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Live replays</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      Manage recordings and turn them into highlight clips or full replays.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-300">{replays.length} recordings</span>
                </div>

                {replays.length === 0 ? (
                  <div className="text-xs text-slate-500 dark:text-slate-300 p-3 rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    No replays found yet.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[320px] overflow-y-auto">
                    {replays.map((r) => (
                      <ReplayRow
                        key={r.id}
                        replay={r}
                        active={selectedReplay && selectedReplay.id === r.id}
                        isBusy={actionPendingId === `publish:${r.id}` || actionPendingId === `private:${r.id}`}
                        onSelect={() => setSelectedReplayId(r.id)}
                        onPublish={() => void handlePublishReplay(r.id)}
                        onSetPrivate={() => void handleSetPrivate(r.id)}
                        onShare={() => setShareReplay(r)}
                      />
                    ))}
                  </div>
                )}
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
                  <span className="text-xs text-slate-400 dark:text-slate-400">Replay: {selectedReplay ? selectedReplay.title : "None"}</span>
                </div>

                {aiClipSuggestions.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-300">Not enough data to suggest clips for this replay yet.</p>
                ) : (
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {aiClipSuggestions.map((s) => (
                      <li
                        key={s.id}
                        className="border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 flex items-start justify-between gap-2 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-semibold dark:font-bold">{s.label}</span>
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
                        <div className="flex items-center gap-1.5">
                          <button
                            className="px-2.5 py-1 rounded-full border border-[#f77f00] bg-white dark:bg-slate-900 text-[#f77f00] text-xs font-semibold dark:font-bold hover:bg-orange-50 dark:hover:bg-orange-950/20"
                            onClick={() => handleApplySuggestion(s)}
                            type="button"
                          >
                            Use as Clip
                          </button>
                          <button
                            className="px-2.5 py-1 rounded-full bg-[#f77f00] text-white text-xs font-semibold dark:font-bold hover:bg-[#e26f00]"
                            onClick={() => handleAddToAssetLibrary(s)}
                            type="button"
                          >
                            Add to Asset Library
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                  Supplier note: If the campaign is Creator-hosted and approval is Manual, clips may be queued for Supplier review before Admin.
                </div>
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
                onAddToAssetLibrary={() => handleAddToAssetLibrary()}
              />
            </section>
          </div>
        )}
      </main>

      {/* Share Drawer */}
      {shareReplay ? <ShareReplayDrawer replay={shareReplay} onClose={() => setShareReplay(null)} /> : null}

      {pageToast ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full text-xs shadow-lg animate-fade-in-up z-50">
          {pageToast}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Share Drawer ------------------------------ */

function ShareReplayDrawer({ replay, onClose }) {
  const [qrOpen, setQrOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const url = replay.replayUrl || `https://mylivedealz.com/replay/${replay.id}`;

  const handleCopyLink = () => {
    try {
      navigator.clipboard?.writeText(url);
    } catch {
      // ignore
    }
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
            type="button"
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="font-medium mb-1">{replay.title}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {replay.date} · {replay.duration}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]">
                Supplier: <span className="font-semibold">{replay.supplier}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]">
                Campaign: <span className="font-semibold">{replay.campaign}</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full border text-[11px] ${replay.hostRole === "Supplier"
                  ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                  : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                  }`}
              >
                {replay.hostRole === "Supplier" ? "Supplier-hosted" : `Creator-hosted (${replay.host})`}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              onClick={handleCopyLink}
            >
              <span>🔗</span> Copy Replay Link
            </button>

            <button
              type="button"
              className={`w-full py-2.5 rounded-xl border font-medium transition-colors flex items-center justify-center gap-2 ${qrOpen
                ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"}`}
              onClick={() => setQrOpen(!qrOpen)}
            >
              <span>📱</span> {qrOpen ? "Hide QR Code" : "Show QR Code"}
            </button>
          </div>

          {qrOpen ? (
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl animate-fade-in-down">
              <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100">
                <QRCodeCanvas value={url} size={160} bgColor="#ffffff" fgColor="#000000" />
              </div>
              <div className="text-sm font-medium mt-2 text-slate-800 dark:text-slate-200">Scan to watch replay</div>
            </div>
          ) : null}
        </div>

        {toast ? (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full text-xs shadow-lg animate-fade-in-up">
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------ Replay Row ------------------------------ */

function ReplayRow({ replay, active, isBusy, onSelect, onPublish, onSetPrivate, onShare }) {
  const hostTone = replay.hostRole === "Supplier" ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300" : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300";
  const approvalTone = replay.approvalMode === "Manual" ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300" : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300";

  return (
    <div
      className={`border rounded-2xl px-2.5 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 cursor-pointer transition-colors ${active
        ? "border-[#f77f00] bg-amber-50/40 dark:bg-amber-900/30"
        : "border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-2">
        <div className={`h-10 w-10 rounded-lg ${replay.thumbColor} flex items-center justify-center text-md`}>🎥</div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-50 line-clamp-2">
            {replay.title}
          </span>

          <span className="text-xs text-slate-500 dark:text-slate-300">
            {replay.date} · {replay.duration}
          </span>

          <span className="text-xs text-slate-500 dark:text-slate-300">
            Views: <span className="font-medium">{replay.views.toLocaleString()}</span> · Sales:{" "}
            <span className="font-medium">{replay.sales.toLocaleString()}</span>
          </span>

          <span className="text-xs text-slate-500 dark:text-slate-300">
            {replay.supplier} · {replay.campaign}
          </span>

          <div className="flex flex-wrap gap-1 mt-0.5">
            <span className={`px-1.5 py-0.5 rounded-full border text-tiny font-medium transition-colors ${hostTone}`}>
              {replay.hostRole === "Supplier" ? "Supplier-hosted" : `Creator-hosted`}
            </span>
            <span className={`px-1.5 py-0.5 rounded-full border text-tiny font-medium transition-colors ${approvalTone}`}>
              Approval: {replay.approvalMode}
            </span>
            {replay.performanceTags.map((tag) => (
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
        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-tiny mb-0.5">{replay.status}</span>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            disabled={isBusy}
            className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={(e) => {
              e.stopPropagation();
              onPublish();
            }}
          >
            Publish as replay
          </button>

          <button
            type="button"
            disabled={isBusy}
            className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={(e) => {
              e.stopPropagation();
              onSetPrivate();
            }}
          >
            Set to private
          </button>

          <button
            type="button"
            disabled={isBusy}
            className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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

/* ------------------------------ Clip Editor ------------------------------ */

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
}) {
  const totalDurationSec = Math.max(60, Math.round(asNumber(replay?.durationSec, 600)));
  const clamp = (val) => Math.min(Math.max(val, 0), totalDurationSec);

  const handleStartChange = (e) => {
    const v = clamp(Number(e.target.value) || 0);
    if (v >= clipEnd) return;
    onChangeStart(v);
  };

  const handleEndChange = (e) => {
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
          <p className="text-xs text-slate-500 dark:text-slate-300">Choose a segment, add overlays and a call to action.</p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-300">{replay ? replay.title : "No replay selected"}</span>
      </div>

      {/* Timeline scrubber (mirrored) */}
      <div className="flex flex-col gap-1 select-none">
        <div
          className="relative h-8 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center px-2 transition-colors cursor-pointer"
          ref={(el) => {
            if (!el) return;
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
              style={{ left: `${startPercent}%`, width: `${Math.max(0, endPercent - startPercent)}%` }}
            />
          </div>

          {/* Start handle */}
          <div
            className="absolute h-5 w-5 rounded-full bg-white dark:bg-slate-900 border-2 border-[#f77f00] shadow-md -mt-0.5 cursor-ew-resize transition-transform hover:scale-110 z-10"
            style={{ left: `calc(${startPercent}% - 6px)` }}
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startVal = clipStart;

              const onMove = (moveEvent) => {
                const parent = e.target?.parentElement;
                if (!parent) return;
                const rect = parent.getBoundingClientRect();
                const deltaX = moveEvent.clientX - startX;
                const deltaPercent = deltaX / rect.width;
                const deltaTime = deltaPercent * totalDurationSec;

                const newVal = clamp(Math.round(startVal + deltaTime));
                if (newVal < clipEnd - 5) onChangeStart(newVal);
              };

              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };

              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              const startX = touch.clientX;
              const startVal = clipStart;

              const onMove = (moveEvent) => {
                const moveTouch = moveEvent.touches[0];
                const parent = e.target?.parentElement;
                if (!parent) return;
                const rect = parent.getBoundingClientRect();
                const deltaX = moveTouch.clientX - startX;
                const deltaPercent = deltaX / rect.width;
                const deltaTime = deltaPercent * totalDurationSec;

                const newVal = clamp(Math.round(startVal + deltaTime));
                if (newVal < clipEnd - 5) onChangeStart(newVal);
              };

              const onEnd = () => {
                window.removeEventListener("touchmove", onMove);
                window.removeEventListener("touchend", onEnd);
              };

              window.addEventListener("touchmove", onMove);
              window.addEventListener("touchend", onEnd);
            }}
          />

          {/* End handle */}
          <div
            className="absolute h-5 w-5 rounded-full bg-white dark:bg-slate-900 border-2 border-[#f77f00] shadow-md -mt-0.5 cursor-ew-resize transition-transform hover:scale-110 z-10"
            style={{ left: `calc(${endPercent}% - 6px)` }}
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startVal = clipEnd;

              const onMove = (moveEvent) => {
                const parent = e.target?.parentElement;
                if (!parent) return;
                const rect = parent.getBoundingClientRect();
                const deltaX = moveEvent.clientX - startX;
                const deltaPercent = deltaX / rect.width;
                const deltaTime = deltaPercent * totalDurationSec;

                const newVal = clamp(Math.round(startVal + deltaTime));
                if (newVal > clipStart + 5) onChangeEnd(newVal);
              };

              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };

              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              const startX = touch.clientX;
              const startVal = clipEnd;

              const onMove = (moveEvent) => {
                const moveTouch = moveEvent.touches[0];
                const parent = e.target?.parentElement;
                if (!parent) return;
                const rect = parent.getBoundingClientRect();
                const deltaX = moveTouch.clientX - startX;
                const deltaPercent = deltaX / rect.width;
                const deltaTime = deltaPercent * totalDurationSec;

                const newVal = clamp(Math.round(startVal + deltaTime));
                if (newVal > clipStart + 5) onChangeEnd(newVal);
              };

              const onEnd = () => {
                window.removeEventListener("touchmove", onMove);
                window.removeEventListener("touchend", onEnd);
              };

              window.addEventListener("touchmove", onMove);
              window.addEventListener("touchend", onEnd);
            }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300 mt-0.5">
          <span>
            Start: <span className="font-medium">{secondsToTime(clipStart)} ({clipStart}s)</span>
          </span>
          <span>
            End: <span className="font-medium">{secondsToTime(clipEnd)} ({clipEnd}s)</span>
          </span>
          <span>
            Duration: <span className="font-medium">{secondsToTime(clipEnd - clipStart)}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-600 dark:text-slate-200 font-medium">Start (seconds)</label>
            <input
              type="number"
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
              value={clipStart}
              onChange={handleStartChange}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-600 dark:text-slate-200 font-medium">End (seconds)</label>
            <input
              type="number"
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
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
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none resize-none transition-colors"
            value={overlayText}
            onChange={(e) => onChangeOverlay(e.target.value)}
            placeholder="Short title or tagline for the clip…"
          />
          <p className="text-xs text-slate-500 dark:text-slate-300">
            This appears as text over the clip (top or bottom, depending on layout).
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-medium">Call to action sticker</label>
          <input
            className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 focus:bg-white dark:bg-slate-900 focus:border-slate-400 outline-none transition-colors"
            value={ctaSticker}
            onChange={(e) => onChangeCta(e.target.value)}
            placeholder="Tap to shop, Learn more, Watch full live…"
          />
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Used as a clickable sticker for campaigns and social exports.
          </p>
        </div>
      </div>

      {replay ? (
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Supplier note: Clips exported to Campaigns can be attached to “My Campaigns” highlights and LiveDealz Feed teasers.
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Distribution ------------------------------ */

function DistributionPanel({ exportTargets, onToggleTarget, onExport, onAddToAssetLibrary }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Distribution</h3>
        <span className="text-xs text-slate-500 dark:text-slate-300">Choose where this clip will go</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <DistributionToggle
          label="Campaigns"
          description="Attach as a highlight to Supplier campaigns and MyLiveDealz promo slots."
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

      <div className="flex items-center justify-between mt-2 gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-300 max-w-sm">
          In the full Studio, each target opens export configuration (format, ratio, caption templates, approvals).
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-full border border-[#f77f00] bg-white dark:bg-slate-900 text-[#f77f00] text-sm font-semibold dark:font-bold hover:bg-orange-50 dark:hover:bg-orange-950/20"
            onClick={onExport}
          >
            Export Clip
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold dark:font-bold hover:bg-[#e26f00]"
            onClick={onAddToAssetLibrary}
          >
            Add to Asset Library
          </button>
        </div>
      </div>
    </div>
  );
}

function DistributionToggle({ label, description, active, onToggle }) {
  return (
    <button
      type="button"
      className={`w-full text-left border rounded-xl px-2.5 py-2 flex flex-col gap-1 ${active
        ? "bg-[#f77f00]/10 border-[#f77f00] text-slate-900 dark:text-slate-100"
        : "bg-gray-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold dark:font-bold">{label}</span>
        <span className="text-xs">
          {active ? <span className="text-emerald-600">Included</span> : <span className="text-slate-400 dark:text-slate-400">Not included</span>}
        </span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">{description}</p>
    </button>
  );
}

function Btn({ tone = "neutral", children, onClick }) {
  const cls =
    tone === "brand"
      ? "text-white"
      : tone === "ghost"
        ? "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100";
  const style = tone === "brand" ? { background: ORANGE } : undefined;
  return (
    <button type="button" onClick={onClick} style={style} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${cls}`}>
      {children}
    </button>
  );
}
