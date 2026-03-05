import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { PayoutMethodsDialog } from "../../shell/PayoutMethodsDialog";
import { useNotification } from "../../contexts/NotificationContext";
import { useEarningsSummaryQuery, useRequestPayoutMutation } from "../../hooks/api/useFinance";
import type { PayoutRecord } from "../../api/types";

type Step = "amount" | "confirm" | "success";

function formatCurrency(amount: number, currency = "USD"): string {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const RequestPayoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useNotification();
  const summaryQuery = useEarningsSummaryQuery();
  const requestPayout = useRequestPayoutMutation();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createdPayout, setCreatedPayout] = useState<PayoutRecord | null>(null);

  const summary = summaryQuery.data?.summary;
  const payoutMethod = summaryQuery.data?.payoutMethod;
  const currency = summary?.currency || "USD";
  const availableBalance = Number(summary?.available || 0);
  const minimumAmount = Number((summaryQuery.data?.payoutPolicy?.minThreshold as number | undefined) || 10);

  useEffect(() => {
    if (!summary || amount) return;
    const defaultAmount = Math.min(500, Number(summary.available || 0));
    setAmount(defaultAmount > 0 ? String(defaultAmount) : "");
  }, [summary, amount]);

  const amountNumber = useMemo(() => Number(amount || 0), [amount]);
  const isAmountValid = amountNumber >= minimumAmount && amountNumber <= availableBalance;
  const feeLabel = String(summaryQuery.data?.payoutPolicy?.feeLabel || "$0.00");
  const settlementWindow = String(summaryQuery.data?.payoutPolicy?.settlementWindow || "Within 48 Hours");

  const handleNext = async () => {
    if (step === "amount") {
      if (!isAmountValid) {
        showError(`Enter an amount between ${formatCurrency(minimumAmount, currency)} and ${formatCurrency(availableBalance, currency)}.`);
        return;
      }
      setStep("confirm");
      return;
    }

    if (step === "confirm") {
      try {
        const payout = await requestPayout.mutateAsync({
          amount: amountNumber,
          method: payoutMethod?.method || "Bank transfer",
          currency,
          recipient: payoutMethod?.detail
        });
        setCreatedPayout(payout);
        setStep("success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to request payout.";
        showError(message);
      }
    }
  };

  const handleBack = () => {
    if (step === "confirm") {
      setStep("amount");
      return;
    }
    navigate("/earnings");
  };

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
        <PageHeader pageTitle="Request Payout" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 text-sm text-slate-500 dark:text-slate-300 shadow-sm">Loading payout workspace…</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader pageTitle="Request Payout" />

      <main className="flex-1 flex flex-col w-full items-center p-4 sm:p-6 lg:p-8 pt-6 gap-6 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-2xl flex flex-col gap-6">
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
                  <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mt-2">{formatCurrency(availableBalance, currency)}</div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Minimum payout: {formatCurrency(minimumAmount, currency)}</p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#f77f00]">{currency}</span>
                    <input
                      type="number"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl pl-20 pr-6 py-5 text-xl sm:text-2xl font-extrabold outline-none focus:border-[#f77f00] transition-all dark:text-slate-100"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      min={minimumAmount}
                      max={availableBalance}
                    />
                  </div>
                  <div className="flex justify-between px-2 text-xs font-semibold text-[#f77f00]">
                    <button onClick={() => setAmount(String(Math.max(minimumAmount, Math.floor(availableBalance / 2))))} className="hover:underline">Withdraw 50%</button>
                    <button onClick={() => setAmount(String(availableBalance))} className="hover:underline">Withdraw All</button>
                  </div>
                  {!isAmountValid && amount && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                      The entered amount is outside the current available balance.
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Payout Method</span>
                    <button onClick={() => setIsDialogOpen(true)} className="text-xs font-semibold text-[#f77f00] hover:underline">Change</button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl shadow-sm">
                      {payoutMethod?.methodType === "mobile" ? "📱" : payoutMethod?.methodType === "wallet" ? "💳" : "🏦"}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold dark:text-slate-100">{payoutMethod?.method || "Bank transfer"}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{payoutMethod?.detail || "Set your payout destination"}</span>
                    </div>
                  </div>
                </div>
                <PayoutMethodsDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSave={() => summaryQuery.refetch()} />
              </>
            )}

            {step === "confirm" && (
              <>
                <div className="text-center">
                  <h2 className="text-xl font-bold dark:text-slate-100">Confirm Withdrawal</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Please review the details before confirming.</p>
                </div>

                <div className="space-y-4">
                  <Row label="Withdrawal Amount" value={formatCurrency(amountNumber, currency)} emphasis />
                  <Row label="Fee" value={feeLabel} />
                  <Row label="Net Receipt" value={formatCurrency(amountNumber, currency)} accent />
                  <Row label="Payout Method" value={payoutMethod?.method || "Bank transfer"} />
                  <Row label="Recipient" value={payoutMethod?.detail || "Primary payout account"} />
                  <Row label="Est. Settlement" value={settlementWindow} />
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex gap-3">
                  <span className="text-xl">⚠️</span>
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    Double-check the destination details before sending the request. Changes after submission may require support review.
                  </div>
                </div>
              </>
            )}

            {step === "success" && (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-4xl">✅</div>
                <div>
                  <h2 className="text-2xl font-bold dark:text-slate-100">Payout request submitted</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
                    Your payout request was created in the backend and is now visible in payout history.
                  </p>
                </div>
                <div className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <Row label="Reference" value={createdPayout?.reference || "—"} />
                    <Row label="Amount" value={formatCurrency(createdPayout?.amount || amountNumber, currency)} />
                    <Row label="Method" value={createdPayout?.method || payoutMethod?.method || "Bank transfer"} />
                    <Row label="Recipient" value={createdPayout?.recipient || payoutMethod?.detail || "Primary payout account"} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button onClick={() => navigate("/payout-history")} className="px-5 py-3 rounded-full bg-[#f77f00] text-white font-semibold hover:bg-[#e26f00] transition-colors">View payout history</button>
                  <button onClick={() => navigate("/earnings")} className="px-5 py-3 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Back to earnings</button>
                </div>
              </div>
            )}
          </section>

          {step !== "success" && (
            <div className="flex items-center justify-between gap-3">
              <button onClick={handleBack} className="px-5 py-3 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">Back</button>
              <button
                onClick={() => void handleNext()}
                disabled={requestPayout.isPending || summaryQuery.isFetching || (step === "amount" && !isAmountValid)}
                className="px-6 py-3 rounded-full bg-[#f77f00] text-white font-semibold hover:bg-[#e26f00] transition-colors disabled:opacity-60"
              >
                {step === "confirm" ? (requestPayout.isPending ? "Submitting…" : "Confirm payout") : "Continue"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

function Row({ label, value, emphasis = false, accent = false }: { label: string; value: string; emphasis?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-none">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-medium ${emphasis ? "font-bold dark:text-slate-100" : accent ? "font-bold text-[#f77f00]" : "dark:text-slate-100"}`}>{value}</span>
    </div>
  );
}
