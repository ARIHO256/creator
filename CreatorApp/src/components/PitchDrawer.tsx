import React, { useState, useMemo } from "react";
import { PitchForm } from "./PitchForm";
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
};

export function PitchDrawer({
    isOpen,
    onClose,
    recipientName,
    recipientInitials,
    recipientRegion,
    defaultCategory,
}: PitchDrawerProps) {
    const [aiSuggestion, setAiSuggestion] = useState("");
    const { run, isPending: _isAiLoading } = useAsyncAction();

    const handleAskAi = () => {
        run(async () => {
            // Simulate AI call
            await new Promise(r => setTimeout(r, 1500));
            setAiSuggestion(`Hi ${recipientName}, I love your brand! I propose a ${defaultCategory} campaign focused on authentic storytelling. I can create 3 engaging Tiktoks and a dedicated Reel to drive conversions.`);
        });
    };

    const finalName = recipientName || "New Pitch";

    // Generate initials from name if not provided: "New Pitch" -> "NP", "GlowUp" -> "GL"
    const derivedInitials = useMemo(() => {
        if (recipientInitials) return recipientInitials;
        const parts = finalName.trim().split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return finalName.slice(0, 2).toUpperCase();
    }, [recipientInitials, finalName]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-[2px] transition-all animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="w-full md:max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-sm transition-transform duration-300 animate-in slide-in-from-right"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex flex-col">
                        <span className="font-bold text-sm uppercase tracking-widest text-[#f77f00]">
                            Start a Pitch
                        </span>
                    </div>
                    <button
                        className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700"
                        onClick={onClose}
                        aria-label="Close drawer"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <section className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold dark:font-bold transition-colors flex-shrink-0">
                            {derivedInitials}
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                {finalName}
                            </h3>
                            {recipientRegion && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {recipientRegion}
                                </span>
                            )}
                        </div>
                    </section>

                    <section>
                        <PitchForm
                            recipientName={recipientName}
                            defaultCategory={defaultCategory}
                            aiSuggestion={aiSuggestion}
                            onAskAi={handleAskAi}
                            onClose={onClose}
                        />
                    </section>
                </div>
            </div>
        </div>
    );
}
