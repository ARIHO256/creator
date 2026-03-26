import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
// import { useTheme } from "../../contexts/ThemeContext";
import { creatorApi } from "../../lib/creatorApi";
import { PayoutMethodsDialog } from "../../shell/PayoutMethodsDialog";
import { getPayoutMethodDisplay } from "../../utils/payoutMethodUtils";

type Step = "amount" | "confirm" | "success";

export const RequestPayoutPage: React.FC = () => {
    const navigate = useNavigate();
    // const { theme } = useTheme();
    const [step, setStep] = useState<Step>("amount");
    const [amount, setAmount] = useState<string>("500");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState(getPayoutMethodDisplay());
    const [availableBalance, setAvailableBalance] = useState(0);
    const [currency, setCurrency] = useState("USD");
    const [transactionId, setTransactionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [requestError, setRequestError] = useState<string | null>(null);

    useEffect(() => {
        // Update payout method display when it changes
        const handlePayoutMethodChange = () => {
            setSelectedMethod(getPayoutMethodDisplay());
        };

        // Listen for custom event (same tab - immediate update)
        window.addEventListener('payoutMethodChanged', handlePayoutMethodChange);
        // Listen for storage event (cross-tab updates)
        window.addEventListener('storage', handlePayoutMethodChange);

        return () => {
            window.removeEventListener('payoutMethodChanged', handlePayoutMethodChange);
            window.removeEventListener('storage', handlePayoutMethodChange);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        void Promise.all([
            creatorApi.earningsSummary(),
            creatorApi.payoutMethods()
        ])
            .then(([summary, payoutMethods]) => {
                if (cancelled) return;
                setAvailableBalance(Number(summary.available || 0));
                const primary = payoutMethods.methods.find((method) => method.isDefault);
                if (primary?.currency) {
                    setCurrency(primary.currency);
                }
                setRequestError(null);
            })
            .catch(() => {
                if (!cancelled) {
                    setRequestError("Unable to load live payout data right now.");
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const handleNext = async () => {
        if (step === "amount") {
            setStep("confirm");
            return;
        }

        setSubmitting(true);
        setRequestError(null);

        try {
            const payout = await creatorApi.requestPayout({
                amount: Number(amount),
                currency,
                note: `Creator payout via ${selectedMethod.name}`,
                metadata: {
                    payoutMethodLabel: selectedMethod.name,
                    payoutMethodDetail: selectedMethod.detail
                }
            });
            setTransactionId(payout.id);
            setStep("success");
        } catch {
            setRequestError("Failed to submit payout request.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleBack = () => {
        if (step === "confirm") setStep("amount");
        else navigate("/earnings");
    };

    return (
        <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
            <PageHeader
                pageTitle="Request Payout"
            />

            <main className="flex-1 flex flex-col w-full items-center p-4 sm:p-6 lg:p-8 pt-6 gap-6 overflow-y-auto overflow-x-hidden">
                <div className="w-full max-w-2xl flex flex-col gap-6">

                    {/* Stepper Indication */}
                    {step !== "success" && (
                        <div className="flex items-center justify-center gap-4 mb-2">
                            <div className={`h-2 flex-1 rounded-full transition-all ${step === "amount" ? "bg-[#f77f00]" : "bg-emerald-500"}`} />
                            <div className={`h-2 flex-1 rounded-full transition-all ${step === "confirm" ? "bg-[#f77f00]" : "bg-slate-200 dark:bg-slate-800"}`} />
                        </div>
                    )}

                    <section className="bg-white dark:bg-slate-900 rounded-3xl transition-colors shadow-xl p-8 md:p-10 flex flex-col gap-8 border border-slate-100 dark:border-slate-800/50">

                        {step === "amount" && (
                            <>
                                <div className="text-center">
                                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Available Balance</span>
                                    <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                                        {currency} {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#f77f00]">{currency}</span>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl pl-20 pr-6 py-5 text-xl sm:text-2xl font-extrabold outline-none focus:border-[#f77f00] transition-all dark:text-slate-100"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            min="10"
                                            max={availableBalance}
                                        />
                                    </div>
                                    <div className="flex justify-between px-2">
                                        <button onClick={() => setAmount((availableBalance / 2).toString())} className="text-xs font-semibold text-[#f77f00] hover:underline">Withdraw 50%</button>
                                        <button onClick={() => setAmount(availableBalance.toString())} className="text-xs font-semibold text-[#f77f00] hover:underline">Withdraw All</button>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Payout Method</span>
                                        <button
                                            onClick={() => setIsDialogOpen(true)}
                                            className="text-xs font-semibold text-[#f77f00] hover:underline"
                                        >
                                            Change
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl shadow-sm">{selectedMethod.icon}</div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold dark:text-slate-100">{selectedMethod.name}</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{selectedMethod.detail}</span>
                                        </div>
                                    </div>
                                </div>
                                <PayoutMethodsDialog
                                    isOpen={isDialogOpen}
                                    onClose={() => setIsDialogOpen(false)}
                                />
                                {requestError ? (
                                    <p className="text-xs text-amber-600 dark:text-amber-400">{requestError}</p>
                                ) : null}
                            </>
                        )}

                        {step === "confirm" && (
                            <>
                                <div className="text-center">
                                    <h2 className="text-xl font-bold dark:text-slate-100">Confirm Withdrawal</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Please review the details before confirming.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-slate-500 dark:text-slate-400">Withdrawal Amount</span>
                                        <span className="font-bold dark:text-slate-100">{currency} {parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-slate-500 dark:text-slate-400">Fee</span>
                                        <span className="font-medium text-slate-400">$0.00 (Free for Silver Tier)</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-slate-500 dark:text-slate-400">Net Receipt</span>
                                        <span className="font-bold text-[#f77f00]">{currency} {parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-slate-500 dark:text-slate-400">Est. Settlement</span>
                                        <span className="font-medium dark:text-slate-100">Within 48 Hours</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex gap-3">
                                    <span className="text-xl">⚠️</span>
                                    <p className="text-xs text-amber-800 dark:text-amber-500 leading-relaxed font-medium">
                                        Funds will be settled to your <strong>{selectedMethod.name}</strong>. Ensure your account is active to avoid delays.
                                    </p>
                                </div>
                                {requestError ? (
                                    <p className="text-xs text-rose-600 dark:text-rose-400">{requestError}</p>
                                ) : null}
                            </>
                        )}

                        {step === "success" && (
                            <div className="flex flex-col items-center text-center gap-6 py-4">
                                <div className="h-24 w-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-5xl shadow-inner animate-bounce">✨</div>
                                <div>
                                    <h2 className="text-2xl font-bold dark:text-slate-100">Withdrawal Requested!</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                        We've received your request for <strong>{currency} {parseFloat(amount).toLocaleString()}</strong>. Your funds are on their way to your {selectedMethod.name.toLowerCase()}.
                                    </p>
                                </div>
                                <div className="flex flex-col w-full gap-3 mt-4">
                                    <button
                                        onClick={() => navigate("/earnings")}
                                        className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white font-bold hover:bg-slate-800 transition-all shadow-lg"
                                    >
                                        Go to Earnings
                                    </button>
                                    <button
                                        onClick={() => navigate("/payout-history")}
                                        className="w-full py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                                    >
                                        View Status in History
                                    </button>
                                </div>
                            </div>
                        )}

                        {step !== "success" && (
                            <div className="flex flex-col gap-3 mt-4">
                                <button
                                    onClick={handleNext}
                                    disabled={loading || submitting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance}
                                    className="w-full py-5 rounded-2xl bg-[#f77f00] text-white text-lg font-bold hover:bg-[#e26f00] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20"
                                >
                                    {loading ? "Loading..." : submitting ? "Submitting..." : step === "amount" ? "Continue" : "Confirm and Withdraw"}
                                </button>
                                <button
                                    onClick={handleBack}
                                    className="w-full py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                                >
                                    {step === "amount" ? "Cancel and Go Back" : "Go Back to Amount"}
                                </button>
                            </div>
                        )}
                    </section>

                    {step !== "success" && (
                        <p className="text-center text-xs text-slate-400 dark:text-slate-600">
                            Transaction ID: {transactionId || "Pending creation"}
                        </p>
                    )}

                </div>
            </main>
        </div>
    );
};
