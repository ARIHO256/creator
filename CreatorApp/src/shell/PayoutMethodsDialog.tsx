import React, { useState, useEffect } from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import { creatorApi } from "../lib/creatorApi";
import {
    buildPayoutMethodsPayload,
    getPayoutMethodDisplayFromApi,
    normalizePayoutMethodType,
    savePayoutMethod
} from "../utils/payoutMethodUtils";

export type PayoutMethod = "bank" | "mobile" | "wallet";

interface PayoutMethodsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (method: PayoutMethod, details: string) => void;
}

const STORAGE_KEY_METHOD = "evzone_payout_method";
const STORAGE_KEY_DETAILS = "evzone_payout_details";

export const PayoutMethodsDialog: React.FC<PayoutMethodsDialogProps> = ({ isOpen, onClose, onSave }) => {
    const [selectedMethod, setSelectedMethod] = useState<PayoutMethod>("bank");
    const [accountDetails, setAccountDetails] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Lock background scroll when open
    useScrollLock(isOpen);

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;

        const savedMethod = localStorage.getItem(STORAGE_KEY_METHOD) as PayoutMethod | null;
        const savedDetails = localStorage.getItem(STORAGE_KEY_DETAILS);

        if (savedMethod) setSelectedMethod(savedMethod);
        if (savedDetails) {
            setAccountDetails(savedDetails);
        } else if (savedMethod === "bank") {
            setAccountDetails("Standard Chartered Bank • Ronald Isabirye • 0123456789");
        }

        void creatorApi.payoutMethods()
            .then((response) => {
                if (cancelled) return;
                const primary = response.methods.find((method) => method.isDefault) || response.methods[0];
                if (!primary) return;

                const display = getPayoutMethodDisplayFromApi(primary);
                setSelectedMethod(normalizePayoutMethodType(primary.type || primary.kind));
                setAccountDetails(display.detail);
                savePayoutMethod(normalizePayoutMethodType(primary.type || primary.kind), display.detail);
                setLoadError(null);
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadError("Using saved payout details until the backend is available.");
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await creatorApi.updatePayoutMethods(buildPayoutMethodsPayload(selectedMethod, accountDetails));
            savePayoutMethod(selectedMethod, accountDetails);
            setLoadError(null);
            setIsSaving(false);
            onSave?.(selectedMethod, accountDetails);
            onClose();
        } catch {
            setIsSaving(false);
            setLoadError("Failed to save payout method to the backend.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold dark:text-white">Edit Payout Method</h2>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto max-h-[70vh] flex flex-col gap-6">
                    <div>
                        <h3 className="text-sm font-semibold dark:text-slate-200 mb-3">Choose Payout Method</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <MethodCard
                                id="bank"
                                label="Bank Account"
                                icon="🏦"
                                selected={selectedMethod === "bank"}
                                onSelect={setSelectedMethod}
                            />
                            <MethodCard
                                id="mobile"
                                label="Mobile Money"
                                icon="📱"
                                selected={selectedMethod === "mobile"}
                                onSelect={setSelectedMethod}
                            />
                            <MethodCard
                                id="wallet"
                                label="Digital Wallet"
                                icon="💳"
                                selected={selectedMethod === "wallet"}
                                onSelect={setSelectedMethod}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold dark:text-slate-200">Account Details</label>
                        <textarea
                            rows={4}
                            className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-[#f77f00] outline-none transition-all resize-none dark:text-white placeholder-slate-400"
                            placeholder="Bank details, Mobile number, or Email..."
                            value={accountDetails}
                            onChange={(e) => setAccountDetails(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-500 font-medium">
                            Manual verification may take up to 24 hours after changing details.
                        </p>
                        {loadError ? (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400">{loadError}</p>
                        ) : null}
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-full text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-2.5 rounded-full bg-[#f77f00] text-white text-sm font-bold hover:bg-[#e26f00] transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MethodCard: React.FC<{
    id: PayoutMethod;
    label: string;
    icon: string;
    selected: boolean;
    onSelect: (id: PayoutMethod) => void;
}> = ({ id, label, icon, selected, onSelect }) => (
    <button
        onClick={() => onSelect(id)}
        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${selected
            ? "border-[#f77f00] bg-orange-50/50 dark:bg-orange-900/10 shadow-md"
            : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200"
            }`}
    >
        <span className="text-2xl">{icon}</span>
        <span className={`text-[11px] font-bold uppercase tracking-wider ${selected ? "text-[#f77f00]" : "text-slate-500"}`}>
            {label}
        </span>
        {selected && <div className="h-1.5 w-1.5 rounded-full bg-[#f77f00]" />}
    </button>
);
