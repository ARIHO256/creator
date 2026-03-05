import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarClock, CheckCircle2, Copy, ExternalLink, Film, MessageCircle, Plus, Save, Scissors, Sparkles, UploadCloud, Video } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useNotification } from "../../contexts/NotificationContext";
import {
  useLiveSessionQuery,
  usePublishReplayMutation,
  useReplayBySessionQuery,
  useUpdateReplayMutation
} from "../../hooks/api/useLiveRuntime";
import type { LiveReplayClipRecord } from "../../api/types";
import { formatDateTime, getLiveHeroImage } from "../../utils/runtimeData";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

function parseSessionId(search: string): string | undefined {
  const value = new URLSearchParams(search).get("sessionId") || undefined;
  return value?.trim() || undefined;
}

function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" }) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
        : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return <span className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", toneClass)}>{label}</span>;
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

function MetricTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
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
      aria-pressed={checked}
    >
      <span className={cx("inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}

function LinkButton({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
    >
      {icon}
      {children}
    </button>
  );
}

function buildDefaultClips(title: string): LiveReplayClipRecord[] {
  return [
    { id: "clip_hook", title: `${title} Hook`, startSec: 0, endSec: 20, format: "9:16", status: "Draft" },
    { id: "clip_offer", title: `${title} Offer close`, startSec: 20, endSec: 45, format: "1:1", status: "Draft" }
  ];
}

export default function PostLivePublisherPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showNotification, showSuccess } = useNotification();
  const sessionId = useMemo(() => parseSessionId(location.search), [location.search]);

  const sessionQuery = useLiveSessionQuery(sessionId, { enabled: Boolean(sessionId) });
  const replayQuery = useReplayBySessionQuery(sessionId, { enabled: Boolean(sessionId) });
  const updateReplayMutation = useUpdateReplayMutation();
  const publishReplayMutation = usePublishReplayMutation();

  const session = sessionQuery.data;
  const replay = replayQuery.data;
  const heroImage = getLiveHeroImage(session);

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

  useEffect(() => {
    if (!replay) return;
    setTitle(replay.title || session?.title || "Untitled replay");
    setHook(replay.hook || "");
    setRetention(replay.retention || "");
    setNotesText(Array.isArray(replay.notes) ? replay.notes.join("\n") : "");
    setReplayUrl(replay.replayUrl || "");
    setCoverUrl(replay.coverUrl || heroImage || "");
    setAllowComments(Boolean(replay.allowComments ?? true));
    setShowProductStrip(Boolean(replay.showProductStrip ?? true));
    setScheduledPublishAt(replay.scheduledPublishAt ? String(replay.scheduledPublishAt).slice(0, 16) : "");
    setClips(Array.isArray(replay.clips) && replay.clips.length ? replay.clips : buildDefaultClips(replay.title || session?.title || "Replay"));
  }, [heroImage, replay, session?.title]);

  const notes = useMemo(
    () => notesText.split(/\n|,/).map((entry) => entry.trim()).filter(Boolean),
    [notesText]
  );

  const clipCount = clips.length;
  const publishedLabel = replay?.published ? "Published" : "Draft";

  const handleSave = async () => {
    if (!replay?.id) return;
    try {
      await updateReplayMutation.mutateAsync({
        replayId: replay.id,
        payload: {
          title: title.trim() || session?.title || "Untitled replay",
          hook: hook.trim(),
          retention: retention.trim(),
          notes,
          replayUrl: replayUrl.trim(),
          coverUrl: coverUrl.trim(),
          allowComments,
          showProductStrip,
          clips,
          scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null
        }
      });
      showSuccess("Replay draft saved to the backend.");
    } catch {
      showError("Replay draft could not be saved.");
    }
  };

  const handlePublish = async () => {
    if (!replay?.id) return;
    try {
      await publishReplayMutation.mutateAsync({
        replayId: replay.id,
        payload: {
          title: title.trim() || session?.title || "Untitled replay",
          hook: hook.trim(),
          retention: retention.trim(),
          notes,
          replayUrl: replayUrl.trim(),
          coverUrl: coverUrl.trim(),
          allowComments,
          showProductStrip,
          clips,
          scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
          published: true
        }
      });
      showSuccess("Replay published from backend state.");
    } catch {
      showError("Replay could not be published.");
    }
  };

  const updateClip = (clipId: string, patch: Partial<LiveReplayClipRecord>) => {
    setClips((current) => current.map((clip) => (clip.id === clipId ? { ...clip, ...patch } : clip)));
  };

  const addClip = () => {
    setClips((current) => [
      ...current,
      {
        id: `clip_${Date.now()}`,
        title: `New clip ${current.length + 1}`,
        startSec: 0,
        endSec: 30,
        format: "9:16",
        status: "Draft"
      }
    ]);
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
        <PageHeader pageTitle="Post-Live Publisher" />
        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <SectionCard title="No session selected" subtitle="Open Post-Live from an ended live session first.">
            <button
              type="button"
              onClick={() => navigate("/live-dashboard-2")}
              className="rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
            >
              Back to live dashboard
            </button>
          </SectionCard>
        </main>
      </div>
    );
  }

  const loading = sessionQuery.isLoading || replayQuery.isLoading;
  const failed = sessionQuery.isError || replayQuery.isError || !session || !replay;

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="Post-Live Publisher"
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Pill label={publishedLabel} tone={replay?.published ? "good" : "warn"} />
            {replay?.publishedAt ? <Pill label={`Published ${formatDateTime(replay.publishedAt)}`} /> : null}
          </div>
        }
        rightContent={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!replay || updateReplayMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Save draft
            </button>
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={!replay || publishReplayMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UploadCloud className="h-4 w-4" />
              Publish replay
            </button>
          </div>
        }
      />

      <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <SectionCard title="Loading replay workspace" subtitle="Fetching the session and replay payload from the backend.">
            <div className="text-sm text-slate-500 dark:text-slate-400">Preparing your post-live tools…</div>
          </SectionCard>
        ) : failed ? (
          <SectionCard title="Replay workspace unavailable" subtitle="This session or replay draft could not be loaded.">
            <div className="text-sm text-rose-700 dark:text-rose-300">Please go back to the live dashboard and reopen Post-Live.</div>
          </SectionCard>
        ) : (
          <>
            <SectionCard title={session.title} subtitle={`${session.seller || "Unassigned seller"} · ${session.campaign || "Unassigned campaign"}`}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 transition-colors">
                  {coverUrl || heroImage ? (
                    <img src={coverUrl || heroImage} alt={session.title} className="h-full min-h-[220px] w-full object-cover" />
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center text-slate-400 dark:text-slate-500">
                      <Video className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <MetricTile label="Session ended" value={formatDateTime(session.scheduledFor)} hint="Published builder schedule" />
                  <MetricTile label="Replay clips" value={String(clipCount)} hint="Backend-persisted clip plan" />
                  <MetricTile label="Comments" value={allowComments ? "On" : "Off"} hint="Replay audience interaction" />
                </div>
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
              <div className="space-y-6">
                <SectionCard title="Replay metadata" subtitle="These fields now save directly to the replay record in the API.">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Replay title">
                      <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]" />
                    </Field>
                    <Field label="Replay URL">
                      <input value={replayUrl} onChange={(event) => setReplayUrl(event.target.value)} className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]" />
                    </Field>
                    <Field label="Hook summary">
                      <input value={hook} onChange={(event) => setHook(event.target.value)} className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]" />
                    </Field>
                    <Field label="Retention insight">
                      <input value={retention} onChange={(event) => setRetention(event.target.value)} className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]" />
                    </Field>
                    <Field label="Cover image URL">
                      <input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]" />
                    </Field>
                    <Field label="Scheduled publish time">
                      <input type="datetime-local" value={scheduledPublishAt} onChange={(event) => setScheduledPublishAt(event.target.value)} className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]" />
                    </Field>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Replay notes">
                      <textarea value={notesText} onChange={(event) => setNotesText(event.target.value)} rows={6} className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]" placeholder="One note per line" />
                    </Field>
                    <div className="space-y-4">
                      <ToggleRow label="Allow comments" hint="Keep replay conversation open for viewers." checked={allowComments} onChange={setAllowComments} />
                      <ToggleRow label="Show product strip" hint="Display the item carousel below the replay." checked={showProductStrip} onChange={setShowProductStrip} />
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Quick actions</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <LinkButton onClick={() => navigate(`/live-studio?sessionId=${encodeURIComponent(session.id)}`)} icon={<Film className="h-4 w-4" />}>Back to studio</LinkButton>
                          <LinkButton onClick={() => navigate(`/live-builder?sessionId=${encodeURIComponent(session.id)}`)} icon={<Sparkles className="h-4 w-4" />}>Open builder</LinkButton>
                          <LinkButton onClick={() => {
                            void navigator.clipboard.writeText(replayUrl || replay.replayUrl || "");
                            showNotification("Replay link copied.");
                          }} icon={<Copy className="h-4 w-4" />}>Copy replay link</LinkButton>
                          <LinkButton onClick={() => window.open(replayUrl || replay.replayUrl || "_blank", "_blank")} icon={<ExternalLink className="h-4 w-4" />}>Preview link</LinkButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Replay clips" subtitle="Edit the post-live clip plan that will be saved with the replay.">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-500 dark:text-slate-400">Each clip block below is persisted back to the replay draft on save or publish.</div>
                    <button
                      type="button"
                      onClick={addClip}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add clip
                    </button>
                  </div>
                  <div className="space-y-3">
                    {clips.map((clip) => (
                      <div key={clip.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_120px_120px_120px]">
                          <input
                            value={clip.title}
                            onChange={(event) => updateClip(clip.id, { title: event.target.value })}
                            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]"
                          />
                          <input
                            type="number"
                            min={0}
                            value={clip.startSec}
                            onChange={(event) => updateClip(clip.id, { startSec: Number(event.target.value || 0) })}
                            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]"
                          />
                          <input
                            type="number"
                            min={0}
                            value={clip.endSec}
                            onChange={(event) => updateClip(clip.id, { endSec: Number(event.target.value || 0) })}
                            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]"
                          />
                          <select
                            value={clip.format}
                            onChange={(event) => updateClip(clip.id, { format: event.target.value })}
                            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00]"
                          >
                            <option value="9:16">9:16</option>
                            <option value="1:1">1:1</option>
                            <option value="16:9">16:9</option>
                          </select>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Pill label={`${clip.startSec}s → ${clip.endSec}s`} />
                          <Pill label={clip.status} tone={clip.status.toLowerCase() === "exported" ? "good" : "neutral"} />
                          <button
                            type="button"
                            onClick={() => setClips((current) => current.filter((entry) => entry.id !== clip.id))}
                            className="ml-auto inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-900/10"
                          >
                            Remove clip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              <div className="space-y-6">
                <SectionCard title="Distribution checklist" subtitle="Post-publish actions now work from the replay record, not mock state.">
                  <div className="space-y-3 text-sm">
                    <ChecklistRow icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} title="Replay payload" text="Metadata, notes, clip plan, and toggles save back to the backend replay object." />
                    <ChecklistRow icon={<CalendarClock className="h-4 w-4 text-[#f77f00]" />} title="Timed release" text={scheduledPublishAt ? `Scheduled for ${formatDateTime(new Date(scheduledPublishAt).toISOString())}` : "No delayed publish time set."} />
                    <ChecklistRow icon={<Scissors className="h-4 w-4 text-[#f77f00]" />} title="Clip workflow" text={`${clipCount} clips ready for post-live export planning.`} />
                    <ChecklistRow icon={<MessageCircle className="h-4 w-4 text-[#f77f00]" />} title="Engagement mode" text={allowComments ? "Comments remain enabled for replay engagement." : "Comments are disabled for this replay."} />
                  </div>
                </SectionCard>

                <SectionCard title="Send & share" subtitle="Use the replay URL generated from the published payload.">
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Replay URL</div>
                      <div className="mt-2 break-all text-xs">{replayUrl || replay.replayUrl || "No replay URL saved yet."}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <LinkButton onClick={() => {
                        void navigator.clipboard.writeText(replayUrl || replay.replayUrl || "");
                        showNotification("Replay URL copied for WhatsApp/Telegram sharing.");
                      }} icon={<Copy className="h-4 w-4" />}>Copy for messaging</LinkButton>
                      <LinkButton onClick={() => navigate("/audience-notification")} icon={<MessageCircle className="h-4 w-4" />}>Audience notifications</LinkButton>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div>
        <div className="font-semibold text-slate-900 dark:text-slate-100">{label}</div>
        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function ChecklistRow({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {icon}
        {title}
      </div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text}</div>
    </div>
  );
}
