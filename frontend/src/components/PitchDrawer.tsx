import React, { useMemo, useState } from "react";
import { PitchForm, type PitchFormSubmission } from "./PitchForm";
import { useAsyncAction } from "../hooks/useAsyncAction";

type PitchDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientInitials: string;
  recipientRegion?: string;
  defaultCategory?: string;
  aiSuggestion?: string;
  onAskAi?: () => void;
  onSubmit?: (payload: PitchFormSubmission) => Promise<void>;
  submitLabel?: string;
};

export function PitchDrawer({
  isOpen,
  onClose,
  recipientName,
  recipientInitials,
  recipientRegion,
  defaultCategory,
  aiSuggestion,
  onAskAi,
  onSubmit,
  submitLabel
}: PitchDrawerProps) {
  const [aiDraft, setAiDraft] = useState(aiSuggestion ?? "");
  const { run } = useAsyncAction();

  const finalName = recipientName || "New pitch";

  const derivedInitials = useMemo(() => {
    if (recipientInitials) return recipientInitials;
    const parts = finalName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return finalName.slice(0, 2).toUpperCase();
  }, [finalName, recipientInitials]);

  const handleAskAi = () => {
    if (onAskAi) {
      onAskAi();
      return;
    }

    void run(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setAiDraft(
          `Hi ${finalName}, I would love to run a ${defaultCategory || "creator-led"} campaign that combines authentic storytelling, clear product demos, and conversion-focused calls to action.`
        );
      },
      { delay: 0, showSuccess: false, showError: true, errorMessage: "Could not generate an AI draft." }
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col border-l border-slate-200 bg-white text-sm shadow-2xl transition-colors animate-in slide-in-from-right dark:border-slate-800 dark:bg-slate-900 md:max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#f77f00]">Start a pitch</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{finalName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pitch drawer"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
              {derivedInitials}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{finalName}</h3>
              {recipientRegion && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{recipientRegion}</p>}
              {defaultCategory && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Default category: <span className="font-medium text-slate-700 dark:text-slate-200">{defaultCategory}</span>
                </p>
              )}
            </div>
          </section>

          <PitchForm
            recipientName={finalName}
            defaultCategory={defaultCategory}
            aiSuggestion={aiDraft}
            onAskAi={handleAskAi}
            onClose={onClose}
            onSubmit={onSubmit}
            submitLabel={submitLabel}
          />
        </div>
      </div>
    </div>
  );
}
