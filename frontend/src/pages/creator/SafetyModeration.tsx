import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck, Save, X } from "lucide-react";
import type { SafetyModerationToolConfigRecord } from "../../api/types";
import { SupportButton, SupportInput, SupportPage, SupportSection, SupportSelect, SupportStat, SupportToggle, EmptyState, ErrorState, LoadingState } from "../../components/live/SupportSurface";
import { useNotification } from "../../contexts/NotificationContext";
import { useSafetyToolQuery, useUpdateSafetyToolMutation } from "../../hooks/api/useLiveSupportTools";

const ROLE_MODE_OPTIONS = [
  { value: "creator", label: "Creator" },
  { value: "moderator", label: "Moderator" },
  { value: "ops_viewer", label: "Ops viewer" }
] as const;

const EMPTY_CONFIG: SafetyModerationToolConfigRecord = {
  roleMode: "moderator",
  muteChat: false,
  slowMode: true,
  linkBlocking: true,
  keywordRules: []
};

export default function SafetyModerationPage() {
  const { showError, showSuccess } = useNotification();
  const toolQuery = useSafetyToolQuery();
  const updateToolMutation = useUpdateSafetyToolMutation();

  const [formState, setFormState] = useState<SafetyModerationToolConfigRecord>(EMPTY_CONFIG);
  const [newKeyword, setNewKeyword] = useState("");

  useEffect(() => {
    if (!toolQuery.data) return;
    setFormState({
      ...EMPTY_CONFIG,
      ...toolQuery.data,
      keywordRules: Array.isArray(toolQuery.data.keywordRules) ? toolQuery.data.keywordRules : []
    });
  }, [toolQuery.data]);

  const stats = useMemo(() => ({
    keywords: formState.keywordRules?.length || 0,
    mute: formState.muteChat ? "On" : "Off",
    slowMode: formState.slowMode ? "On" : "Off",
    linkBlocking: formState.linkBlocking ? "On" : "Off"
  }), [formState.keywordRules, formState.linkBlocking, formState.muteChat, formState.slowMode]);

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    setFormState((current) => ({
      ...current,
      keywordRules: Array.from(new Set([...(current.keywordRules || []), trimmed]))
    }));
    setNewKeyword("");
  };

  const removeKeyword = (keyword: string) => {
    setFormState((current) => ({
      ...current,
      keywordRules: (current.keywordRules || []).filter((entry) => entry !== keyword)
    }));
  };

  const handleSave = async () => {
    try {
      await updateToolMutation.mutateAsync({
        roleMode: formState.roleMode,
        muteChat: Boolean(formState.muteChat),
        slowMode: Boolean(formState.slowMode),
        linkBlocking: Boolean(formState.linkBlocking),
        keywordRules: formState.keywordRules
      });
      showSuccess("Safety and moderation settings saved to the backend.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not save moderation settings.");
    }
  };

  if (toolQuery.isLoading && !toolQuery.data) {
    return (
      <SupportPage title="Safety & Moderation">
        <LoadingState label="Loading moderation settings…" />
      </SupportPage>
    );
  }

  if (toolQuery.error && !toolQuery.data) {
    return (
      <SupportPage title="Safety & Moderation">
        <ErrorState message={toolQuery.error instanceof Error ? toolQuery.error.message : "Could not load the moderation surface."} />
      </SupportPage>
    );
  }

  return (
    <SupportPage
      title="Safety & Moderation"
      badge={<span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Backend-driven</span>}
      rightContent={<SupportButton tone="primary" onClick={handleSave} disabled={updateToolMutation.isPending}>{updateToolMutation.isPending ? "Saving…" : "Save moderation"}</SupportButton>}
    >
      <section className="grid gap-3 md:grid-cols-4">
        <SupportStat label="Keyword rules" value={stats.keywords} accent />
        <SupportStat label="Emergency mute" value={stats.mute} />
        <SupportStat label="Slow mode" value={stats.slowMode} />
        <SupportStat label="Link blocking" value={stats.linkBlocking} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_440px]">
        <SupportSection title="Moderation controls" description="These main moderation toggles now read from and write to the backend tool payload.">
          <div className="grid gap-3 md:grid-cols-[240px_minmax(0,1fr)]">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Role mode</label>
              <SupportSelect value={formState.roleMode || "moderator"} onChange={(event) => setFormState((current) => ({ ...current, roleMode: event.target.value }))}>
                {ROLE_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </SupportSelect>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                <div className="text-sm font-semibold">Emergency mute chat</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Stop outgoing chat for urgent moderation events.</div>
                <div className="mt-3 flex justify-end"><SupportToggle checked={Boolean(formState.muteChat)} onChange={(value) => setFormState((current) => ({ ...current, muteChat: value }))} /></div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                <div className="text-sm font-semibold">Slow mode</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Throttle chat bursts during heavy traffic moments.</div>
                <div className="mt-3 flex justify-end"><SupportToggle checked={Boolean(formState.slowMode)} onChange={(value) => setFormState((current) => ({ ...current, slowMode: value }))} /></div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                <div className="text-sm font-semibold">Block links</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Reduce external-checkout and spam-link risk.</div>
                <div className="mt-3 flex justify-end"><SupportToggle checked={Boolean(formState.linkBlocking)} onChange={(value) => setFormState((current) => ({ ...current, linkBlocking: value }))} /></div>
              </div>
            </div>
          </div>
        </SupportSection>

        <SupportSection title="Keyword rules" description="Manage blocked or flagged phrases. The keyword list is now persisted in the backend moderation config.">
          <div className="flex gap-2">
            <SupportInput value={newKeyword} onChange={(event) => setNewKeyword(event.target.value)} placeholder="Add a keyword or phrase" onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addKeyword();
              }
            }} />
            <SupportButton onClick={addKeyword}>Add</SupportButton>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(formState.keywordRules || []).map((keyword) => (
              <span key={keyword} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm dark:border-slate-700 dark:bg-slate-950">
                {keyword}
                <button type="button" onClick={() => removeKeyword(keyword)} className="rounded-full p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          {!(formState.keywordRules || []).length ? <div className="mt-3"><EmptyState message="No moderation keywords are configured yet." /></div> : null}
        </SupportSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SupportSection title="Moderation posture" description="Use this summary to review the current saved protection posture before going live.">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-center gap-2 font-semibold"><Shield className="h-4 w-4 text-[#f77f00]" /> Role mode</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{ROLE_MODE_OPTIONS.find((option) => option.value === formState.roleMode)?.label || formState.roleMode}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-[#f77f00]" /> Active controls</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{[formState.muteChat && "Mute chat", formState.slowMode && "Slow mode", formState.linkBlocking && "Block links"].filter(Boolean).join(" • ") || "No controls enabled"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-[#f77f00]" /> Rule count</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{stats.keywords} keyword safeguards configured</div>
            </div>
          </div>
        </SupportSection>

        <SupportSection title="What is now persisted" description="These moderation controls are no longer page-only toggles.">
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-[#f77f00]" /> Role mode selection</li>
            <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-[#f77f00]" /> Emergency mute / slow mode / link blocking flags</li>
            <li className="flex items-center gap-2"><Save className="h-4 w-4 text-[#f77f00]" /> Keyword rule list</li>
          </ul>
        </SupportSection>
      </div>
    </SupportPage>
  );
}
