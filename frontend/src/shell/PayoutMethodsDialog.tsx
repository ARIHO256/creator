import React, { useEffect, useMemo, useState } from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import { savePayoutMethod } from "../utils/payoutMethodUtils";
import { useNotification } from "../contexts/NotificationContext";
import { useSettingsQuery, useUpdateSettingsMutation } from "../hooks/api/useSettings";

export type PayoutMethod = "bank" | "mobile" | "wallet";

interface PayoutMethodsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (method: PayoutMethod, details: string) => void | Promise<void>;
}

const STORAGE_KEY_METHOD = "evzone_payout_method";
const STORAGE_KEY_DETAILS = "evzone_payout_details";

function methodLabel(method: PayoutMethod): string {
  if (method === "mobile") return "Mobile Money";
  if (method === "wallet") return "Digital Wallet";
  return "Bank Account";
}

function resolveFromSettings(settings: unknown): { method: PayoutMethod; details: string } {
  const payout = (settings && typeof settings === "object" ? (settings as { payout?: Record<string, unknown> }).payout : undefined) || {};
  const methodType = String(payout.methodType || "").toLowerCase();
  const method = methodType === "mobile" || methodType === "wallet" ? (methodType as PayoutMethod) : "bank";
  const details =
    String(payout.detail || "") ||
    String((payout.bank as { bankName?: string } | undefined)?.bankName || "") ||
    String((payout.mobile as { provider?: string } | undefined)?.provider || "") ||
    String((payout.wallet as { email?: string } | undefined)?.email || "") ||
    "";

  if (details) return { method, details };

  return {
    method,
    details: method === "bank" ? "MyLive Bank • Ronald Isabirye • ****1024" : method === "mobile" ? "MTN • ****222" : "creator@example.com"
  };
}

export const PayoutMethodsDialog: React.FC<PayoutMethodsDialogProps> = ({ isOpen, onClose, onSave }) => {
  const [selectedMethod, setSelectedMethod] = useState<PayoutMethod>("bank");
  const [accountDetails, setAccountDetails] = useState("");
  const { data: settings } = useSettingsQuery();
  const updateSettings = useUpdateSettingsMutation();
  const { showError, showSuccess } = useNotification();

  useScrollLock(isOpen);

  const resolvedDefaults = useMemo(() => {
    const fromSettings = resolveFromSettings(settings);
    const storedMethod = (localStorage.getItem(STORAGE_KEY_METHOD) as PayoutMethod | null) || fromSettings.method;
    const storedDetails = localStorage.getItem(STORAGE_KEY_DETAILS) || fromSettings.details;
    return {
      method: storedMethod,
      details: storedDetails || fromSettings.details
    };
  }, [settings]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMethod(resolvedDefaults.method);
    setAccountDetails(resolvedDefaults.details);
  }, [isOpen, resolvedDefaults]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      const detail = accountDetails.trim();
      if (!detail) {
        showError("Please add payout account details before saving.");
        return;
      }

      await updateSettings.mutateAsync({
        payout: {
          method: methodLabel(selectedMethod),
          methodType: selectedMethod,
          detail
        }
      });

      savePayoutMethod(selectedMethod, detail);
      await Promise.resolve(onSave?.(selectedMethod, detail));
      showSuccess("Payout method updated.");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save payout method.";
      showError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 border border-slate-200 dark:border-slate-800">
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
              <MethodCard id="bank" label="Bank Account" icon="🏦" selected={selectedMethod === "bank"} onSelect={setSelectedMethod} />
              <MethodCard id="mobile" label="Mobile Money" icon="📱" selected={selectedMethod === "mobile"} onSelect={setSelectedMethod} />
              <MethodCard id="wallet" label="Digital Wallet" icon="💳" selected={selectedMethod === "wallet"} onSelect={setSelectedMethod} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold dark:text-slate-200">Account Details</label>
            <textarea
              rows={4}
              className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-[#f77f00] outline-none transition-all resize-none dark:text-white placeholder-slate-400"
              placeholder="Bank details, mobile number, or wallet email..."
              value={accountDetails}
              onChange={(event) => setAccountDetails(event.target.value)}
            />
            <p className="text-[10px] text-slate-500 font-medium">Saving here updates the backend payout profile used across Earnings and Request Payout.</p>
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
            onClick={() => void handleSave()}
            disabled={updateSettings.isPending}
            className="px-8 py-2.5 rounded-full bg-[#f77f00] text-white text-sm font-bold hover:bg-[#e26f00] transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 disabled:opacity-70"
          >
            {updateSettings.isPending ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
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
    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
      selected
        ? "border-[#f77f00] bg-orange-50/50 dark:bg-orange-900/10 shadow-md"
        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200"
    }`}
  >
    <span className="text-2xl">{icon}</span>
    <span className={`text-[11px] font-bold uppercase tracking-wider ${selected ? "text-[#f77f00]" : "text-slate-500"}`}>{label}</span>
    {selected && <div className="h-1.5 w-1.5 rounded-full bg-[#f77f00]" />}
  </button>
);
