import React, { useMemo, useState } from "react";
import { useAsyncAction } from "../hooks/useAsyncAction";

export type PitchFormSubmission = {
  collaborationModel: "Flat fee" | "Commission" | "Hybrid";
  message: string;
};

type PitchFormProps = {
  recipientName: string;
  defaultCategory?: string;
  pitchMode?: boolean;
  aiSuggestion?: string;
  onAskAi?: () => void;
  onClose?: () => void;
  onSubmit?: (payload: PitchFormSubmission) => Promise<void>;
  onSuccess?: () => void;
  submitLabel?: string;
  successMessage?: string;
};

const MODE_OPTIONS: PitchFormSubmission["collaborationModel"][] = ["Flat fee", "Commission", "Hybrid"];

export function PitchForm({
  recipientName,
  defaultCategory = "General",
  pitchMode = false,
  aiSuggestion,
  onAskAi,
  onClose,
  onSubmit,
  onSuccess,
  submitLabel = "Submit pitch",
  successMessage = "Pitch submitted! 🚀"
}: PitchFormProps) {
  const [model, setModel] = useState<PitchFormSubmission["collaborationModel"]>("Hybrid");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const { run, isPending: isSubmitting } = useAsyncAction();

  const trimmedMessage = useMemo(() => message.trim(), [message]);

  const handleApplySuggestion = () => {
    if (!aiSuggestion) return;
    setMessage((current) => (current.trim() ? current : aiSuggestion));
  };

  const handleSubmit = async () => {
    if (!trimmedMessage) return;

    const result = await run(
      async () => {
        if (onSubmit) {
          await onSubmit({ collaborationModel: model, message: trimmedMessage });
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        setIsSuccess(true);
        onSuccess?.();
      },
      {
        successMessage,
        errorMessage: "Could not submit this pitch. Please try again.",
        delay: onSubmit ? 0 : 1000
      }
    );

    if (result && !onSubmit) {
      window.setTimeout(() => {
        onClose?.();
      }, 1000);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      {isSuccess && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/95 p-6 text-center backdrop-blur-sm dark:bg-slate-950/95">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-900/30">
            🚀
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Pitch submitted</h3>
          <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
            Your proposal has been prepared for {recipientName}. You can reopen it to edit while it is still in draft or negotiation.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsSuccess(false)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Edit again
            </button>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="rounded-full bg-[#f77f00] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e26f00]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Pitching as <span className="font-semibold text-slate-700 dark:text-slate-200">Creator</span>
        </span>
        {pitchMode && (
          <span className="rounded-full bg-[#f77f00] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            Pitch mode
          </span>
        )}
      </div>

      <div className="space-y-4">
        <section className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Collaboration model
          </label>
          <div className="flex flex-wrap gap-2">
            {MODE_OPTIONS.map((option) => {
              const active = option === model;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setModel(option)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-[#f77f00] bg-[#f77f00] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Your message
          </label>
          <textarea
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
            placeholder={`Describe how you will run this ${defaultCategory} campaign, what you will deliver, and the value you expect to create.`}
          />
          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{trimmedMessage.length} characters</span>
            <span>Clear deliverables and timelines tend to convert better.</span>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              AI assistance
            </label>
            {aiSuggestion && (
              <button
                type="button"
                onClick={handleApplySuggestion}
                className="text-[11px] font-semibold text-[#f77f00] hover:underline"
              >
                Use suggestion
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onAskAi}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <span>🤖</span>
            <span>Ask AI to suggest pitch</span>
          </button>
          {aiSuggestion && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <p className="font-semibold text-slate-700 dark:text-slate-100">Suggested draft</p>
              <p className="mt-1 leading-relaxed">{aiSuggestion}</p>
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || !trimmedMessage || isSuccess}
          className={`w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white transition ${
            isSubmitting || !trimmedMessage || isSuccess
              ? "cursor-not-allowed bg-slate-300 dark:bg-slate-700"
              : "bg-[#f77f00] hover:bg-[#e26f00]"
          }`}
        >
          {isSubmitting ? "Sending pitch..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
