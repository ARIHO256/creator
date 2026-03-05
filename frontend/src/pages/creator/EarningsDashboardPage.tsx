import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { PayoutMethodsDialog } from "../../shell/PayoutMethodsDialog";
import { useEarningsSummaryQuery, usePayoutsQuery } from "../../hooks/api/useFinance";
import type { EarningsBreakdownRow, EarningsSummaryRecord, PayoutRecord } from "../../api/types";

type BreakdownView = "month" | "campaign" | "seller";
type PayoutFilter = "All" | "Paid" | "Requested" | "Scheduled" | "Failed";

function formatCurrency(amount: number, currency = "USD") {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function exportCsv(rows: EarningsBreakdownRow[], filename: string) {
  const headers = ["Label", "Total"];
  const body = rows.map((row) => [row.label, String(row.total)]);
  const csvContent = [headers.join(","), ...body.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
}

function exportStatement(summary: EarningsSummaryRecord["summary"], notes: string[]) {
  const content = [
    "MYLIVEDEALZ CREATOR EARNINGS STATEMENT",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    `Available: ${summary.currency} ${summary.available}`,
    `Pending: ${summary.currency} ${summary.pending}`,
    `Projected: ${summary.currency} ${summary.projected}`,
    `Lifetime: ${summary.currency} ${summary.lifetime || 0}`,
    "",
    "Notes:",
    ...notes.map((note) => `- ${note}`)
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `earnings-statement-${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
}

function statusStyle(status: string) {
  switch (status) {
    case "Paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
    case "Requested":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "Scheduled":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    default:
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
  }
}

function EarningsDashboardPage() {
  const navigate = useNavigate();
  const summaryQuery = useEarningsSummaryQuery();
  const [viewMode, setViewMode] = useState<BreakdownView>("month");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<PayoutFilter>("All");
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);

  const payoutsQuery = usePayoutsQuery({ status: payoutStatusFilter === "All" ? undefined : payoutStatusFilter });
  const summary = summaryQuery.data?.summary || { available: 0, pending: 0, projected: 0, lifetime: 0, currency: "USD" };
  const notes = summaryQuery.data?.notes || [];
  const breakdownData = useMemo<EarningsBreakdownRow[]>(() => {
    if (viewMode === "campaign") return summaryQuery.data?.byCampaign || [];
    if (viewMode === "seller") return summaryQuery.data?.bySeller || [];
    return summaryQuery.data?.byMonth || [];
  }, [summaryQuery.data, viewMode]);
  const forecast = summaryQuery.data?.forecast;
  const composition = summaryQuery.data?.composition || { flatFees: 0, commission: 0, bonuses: 0 };
  const payouts = payoutsQuery.data?.items || [];
  const payoutMethod = summaryQuery.data?.payoutMethod;
  const totalComposition = composition.flatFees + composition.commission + composition.bonuses;
  const maxBreakdown = Math.max(1, ...breakdownData.map((row) => row.total));

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
        <PageHeader pageTitle="Earnings Dashboard" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 text-sm text-slate-500 dark:text-slate-300 shadow-sm">Loading earnings from the backend…</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Earnings Dashboard"
        mobileViewType="hide"
        badge={<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-medium border border-slate-200 dark:border-slate-800 transition-colors"><span>💸</span><span>API-backed finance workspace</span></span>}
      />

      <main className="flex-1 flex flex-col w-full p-4 sm:p-6 lg:p-8 pt-6 gap-6 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-4">
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm p-4 md:p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Earnings summary</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Overview of your available balance, pending amounts, projected month close, and lifetime earnings.</p>
              </div>
              <button onClick={() => navigate("/request-payout")} className="px-4 py-2 rounded-full bg-[#f77f00] text-white text-sm font-semibold hover:bg-[#e26f00] transition-colors">Request payout</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <SummaryCard label="Available" value={formatCurrency(summary.available, summary.currency)} accent />
              <SummaryCard label="Pending" value={formatCurrency(summary.pending, summary.currency)} />
              <SummaryCard label="Projected" value={formatCurrency(summary.projected, summary.currency)} />
              <SummaryCard label="Lifetime" value={formatCurrency(Number(summary.lifetime || 0), summary.currency)} />
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-4 items-start">
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm p-4 md:p-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Earnings breakdown</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Switch between month, campaign, and seller views using backend totals.</p>
                </div>
                <div className="flex items-center gap-2">
                  {(["month", "campaign", "seller"] as BreakdownView[]).map((mode) => (
                    <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${viewMode === mode ? "bg-[#f77f00] border-[#f77f00] text-white" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
                      {mode === "month" ? "By month" : mode === "campaign" ? "By campaign" : "By seller"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {breakdownData.map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-slate-600 dark:text-slate-300 truncate">{row.label}</div>
                    <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-[#f77f00]" style={{ width: `${(row.total / maxBreakdown) * 100}%` }} />
                    </div>
                    <div className="w-24 text-right text-sm font-semibold text-slate-700 dark:text-slate-100">{formatCurrency(row.total, summary.currency)}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Earnings composition</span>
                  <div className="flex items-center gap-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${totalComposition ? (composition.commission / totalComposition) * 100 : 0}%` }} />
                    <div className="h-full bg-[#f77f00]" style={{ width: `${totalComposition ? (composition.flatFees / totalComposition) * 100 : 0}%` }} />
                    <div className="h-full bg-sky-500" style={{ width: `${totalComposition ? (composition.bonuses / totalComposition) * 100 : 0}%` }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <Legend label="Commission" value={formatCurrency(composition.commission, summary.currency)} dot="bg-emerald-500" />
                    <Legend label="Flat fees" value={formatCurrency(composition.flatFees, summary.currency)} dot="bg-[#f77f00]" />
                    <Legend label="Bonuses" value={formatCurrency(composition.bonuses, summary.currency)} dot="bg-sky-500" />
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Forecast</div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{forecast?.month || "Current month"}</div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <MiniMetric label="Current" value={formatCurrency(forecast?.current || 0, summary.currency)} />
                    <MiniMetric label="Projected" value={formatCurrency(forecast?.projected || 0, summary.currency)} />
                    <MiniMetric label="Growth" value={`${forecast?.growth || 0}%`} />
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {notes.map((note) => <li key={note}>• {note}</li>)}
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm p-4 md:p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Exports & payout setup</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your payout destination is pulled from backend settings, not local-only state.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4 space-y-2">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Current payout method</div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{payoutMethod?.method || "Bank transfer"}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{payoutMethod?.detail || "Primary payout account"}</div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => exportCsv(breakdownData, `earnings-${viewMode}-${new Date().toISOString().slice(0, 10)}.csv`)} className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="font-semibold">Export CSV</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Download the current breakdown view as a backend-based export.</div>
                </button>
                <button onClick={() => exportStatement(summary, notes)} className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="font-semibold">Generate statement</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Create a plain-text statement using the API totals above.</div>
                </button>
                <button onClick={() => setIsPayoutDialogOpen(true)} className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="font-semibold">Edit payout method</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Updates the backend payout profile used by Request Payout and history pages.</div>
                </button>
              </div>
            </section>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm p-4 md:p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Payouts & history</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Recent payout records from the backend ledger.</p>
              </div>
              <div className="flex items-center gap-2">
                {(["All", "Paid", "Requested", "Scheduled", "Failed"] as PayoutFilter[]).map((status) => (
                  <button key={status} onClick={() => setPayoutStatusFilter(status)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${payoutStatusFilter === status ? "bg-[#f77f00] border-[#f77f00] text-white" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Method</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Recipient</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {payouts.map((payout) => <PayoutRow key={payout.id} payout={payout} />)}
                  {!payoutsQuery.isLoading && payouts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No payout records match the current filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{payouts.length} records loaded</span>
              <button onClick={() => navigate("/payout-history")} className="font-semibold text-[#f77f00] hover:underline">Open full payout history</button>
            </div>
          </section>

          <PayoutMethodsDialog isOpen={isPayoutDialogOpen} onClose={() => setIsPayoutDialogOpen(false)} onSave={() => summaryQuery.refetch()} />
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${accent ? "border-[#f77f00] bg-[#f77f00]/10 dark:bg-[#f77f00]/15" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function Legend({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      <span>{label}</span>
      <span className="font-semibold text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}

function PayoutRow({ payout }: { payout: PayoutRecord }) {
  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{payout.date}</td>
      <td className="px-4 py-3 text-sm font-semibold text-[#f77f00]">{formatCurrency(payout.amount, payout.currency)}</td>
      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{payout.method}</td>
      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{payout.recipient || "Primary payout account"}</td>
      <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle(payout.status)}`}>{payout.status}</span></td>
      <td className="px-4 py-3 text-sm font-mono text-slate-400 dark:text-slate-500">{payout.reference}</td>
    </tr>
  );
}

export { EarningsDashboardPage };
