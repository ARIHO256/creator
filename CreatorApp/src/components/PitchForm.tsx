import React, { useState } from "react";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { useNotification } from "../contexts/NotificationContext";
import { creatorApi } from "../lib/creatorApi";

type PitchFormProps = {
    recipientName: string;
    defaultCategory?: string;
    pitchMode?: boolean;
    aiSuggestion?: string;
    campaignId?: string;
    campaignTitle?: string;
    sellerId?: string;
    onAskAi?: () => void;
    onClose?: () => void; // Optional: for auto-closing if desired (though success state handles it)
    onSubmitted?: () => void;
};

export function PitchForm({
    recipientName,
    defaultCategory = "General",
    pitchMode = false,
    aiSuggestion,
    campaignId,
    campaignTitle,
    sellerId,
    onAskAi,
    onClose,
    onSubmitted,
}: PitchFormProps) {
    const [model, setModel] = useState("Hybrid");
    const [message, setMessage] = useState("");
    const { run, isPending: isSubmitting } = useAsyncAction();
    const { showError } = useNotification();
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = () => {
        if (!message.trim()) return;
        if (!campaignId && !sellerId) {
            showError("Open pitch from a supplier or campaign so the backend knows who to send it to.");
            return;
        }
        run(async () => {
            const cleanCategory = defaultCategory.trim() || "General";
            const trimmedMessage = message.trim();
            await creatorApi.createProposal({
                campaignId: campaignId || undefined,
                sellerId: sellerId || undefined,
                title: campaignTitle || `Pitch to ${recipientName || "supplier"}`,
                summary: trimmedMessage,
                currency: "USD",
                status: "SUBMITTED",
                metadata: {
                    origin: "my-pitch",
                    category: cleanCategory,
                    offerType: model,
                    notesShort: trimmedMessage.slice(0, 160),
                    campaignTitle: campaignTitle || undefined,
                    recipientName,
                }
            });
            setIsSuccess(true);
            onSubmitted?.();
            if (onClose) {
                window.setTimeout(() => onClose(), 900);
            }
        }, { successMessage: "Pitch submitted." });
    };

    return (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-900 text-sm space-y-2 transition-colors relative overflow-hidden">
            {isSuccess && (
                <div className="absolute inset-0 z-10 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
                        <span className="text-2xl">🚀</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Pitch Submitted!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
                        Good luck! We’ll notify you when {recipientName} responds.
                    </p>
                    <button
                        onClick={() => setIsSuccess(false)}
                        className="mt-3 text-xs text-[#f77f00] font-medium hover:underline"
                    >
                        Undo / Edit
                    </button>
                </div>
            )}
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-300">
                    Pitching as <span className="font-medium">Creator</span>
                </span>
                {pitchMode && (
                    <span className="px-2 py-0.5 rounded-full bg-[#f77f00] text-white text-xs">
                        Pitch mode
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Collaboration model
                </label>
                <div className="flex flex-wrap gap-1">
                    {["Flat fee", "Commission", "Hybrid"].map((m) => (
                        <button
                            key={m}
                            type="button"
                            className={`px-2.5 py-0.5 rounded-full text-xs border ${model === m
                                ? "bg-[#f77f00] border-[#f77f00] text-white"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                }`}
                            onClick={() => setModel(m)}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Your message
                </label>
                <textarea
                    rows={4}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-slate-400 transition-colors dark:text-slate-100"
                    placeholder={`Describe how you will run this ${defaultCategory} campaign…`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    AI assistance
                </label>
                <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 w-fit transition-colors text-slate-700 dark:text-slate-300"
                    onClick={onAskAi}
                >
                    <span>🤖</span>
                    <span>Ask AI to suggest pitch</span>
                </button>
                {aiSuggestion && (
                    <div className="mt-1 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors">
                        <span className="font-medium">Suggested draft:</span>
                        <p className="mt-0.5">{aiSuggestion}</p>
                    </div>
                )}
            </div>

            {!campaignId && !sellerId ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                    Choose a supplier or campaign first. Free-form pitches without a backend recipient are not supported yet.
                </div>
            ) : null}

            <button
                className={`mt-1 w-full py-2 rounded-full text-white text-sm font-semibold transition-all ${isSubmitting
                    ? "bg-slate-300 dark:bg-slate-700 cursor-wait"
                    : "bg-[#f77f00] hover:bg-[#e26f00]"
                    }`}
                onClick={handleSubmit}
                disabled={isSubmitting || isSuccess}
            >
                {isSubmitting ? "Sending pitch..." : "Submit pitch"}
            </button>
        </div>
    );
}
